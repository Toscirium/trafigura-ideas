import { nanoid } from 'nanoid';
import { VESSELS } from 'shared';
import type { DocumentStatus, DocumentType, TradeDocument, Trade, Voyage } from 'shared';
import { store } from '../state/store.js';
import { schedulingStore } from '../state/schedulingStore.js';
import { documentStore } from '../state/documentStore.js';
import { counterpartyStore } from '../state/counterpartyStore.js';
import {
  buildBillOfLading,
  buildCharterParty,
  buildKycDossier,
  buildLetterOfCredit,
  pickDocumentType,
  validateBillOfLading,
  validateCharterParty,
  validateKycDossier,
  validateLetterOfCredit,
  type GroundTruthResult,
} from '../domain/documentIntel.js';
import { extractDocumentFields } from '../domain/llmExtraction.js';
import { clock } from './clock.js';

// Real Claude API calls happen on this tick — kept slow and infrequent by design (a
// live desk demo, not a load test) so leaving the app open doesn't run up API spend.
const TICK_MS = 60_000;
const DOCUMENT_PROBABILITY = 0.7;
const LOW_CONFIDENCE_THRESHOLD = 0.82;

const FILE_PREFIX: Record<DocumentType, string> = {
  'bill-of-lading': 'BOL',
  'letter-of-credit': 'LC',
  'charter-party': 'CP',
  'kyc-dossier': 'KYC',
};

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function statusFor(confidence: number, issueCount: number): DocumentStatus {
  if (issueCount > 0 || confidence < LOW_CONFIDENCE_THRESHOLD) return 'needs-review';
  return 'validated';
}

/** What's needed to validate the LLM's extraction once it comes back, per doc type. */
type EtrmContext =
  | { docType: 'bill-of-lading' | 'charter-party'; voyage: Voyage }
  | { docType: 'letter-of-credit'; trade: Trade | undefined }
  | { docType: 'kyc-dossier' };

function buildGroundTruth(): { ground: GroundTruthResult; context: EtrmContext } | null {
  const docType = pickDocumentType();

  if (docType === 'bill-of-lading' || docType === 'charter-party') {
    const voyages = schedulingStore.listVoyages();
    if (voyages.length === 0) return null;
    const voyage = pick(voyages);
    const vessel = VESSELS.find((v) => v.id === voyage.vesselId);
    const ground = docType === 'bill-of-lading' ? buildBillOfLading(voyage, vessel) : buildCharterParty(voyage, vessel);
    return { ground, context: { docType, voyage } };
  }

  if (docType === 'letter-of-credit') {
    const counterparty = pick(counterpartyStore.list());
    const trade = [...store.trades].reverse().find((t) => t.counterpartyId === counterparty.id);
    return { ground: buildLetterOfCredit(counterparty, trade), context: { docType, trade } };
  }

  return { ground: buildKycDossier(pick(counterpartyStore.list())), context: { docType: 'kyc-dossier' } };
}

async function tick(): Promise<void> {
  if (!clock.running) return;
  if (Math.random() > DOCUMENT_PROBABILITY) return;

  const built = buildGroundTruth();
  if (!built) return;
  const { ground, context } = built;

  const id = nanoid(10);
  const processingDoc: TradeDocument = {
    id,
    receivedAt: new Date().toISOString(),
    fileName: `${FILE_PREFIX[context.docType]}-${nanoid(6).toUpperCase()}.pdf`,
    docType: context.docType,
    counterpartyId: ground.counterpartyId,
    voyageId: ground.voyageId,
    rawText: ground.rawText,
    extracted: null,
    confidence: null,
    status: 'processing',
    issues: [],
    reviewedBy: null,
    reviewedAt: null,
  };
  // Show the document immediately (raw text is real, already rendered) while extraction runs.
  documentStore.addDocument(processingDoc);

  try {
    const { extracted, confidence } = await extractDocumentFields(context.docType, ground.rawText);

    let issues;
    switch (extracted.docType) {
      case 'bill-of-lading':
        issues = validateBillOfLading(extracted.fields, (context as { voyage: Voyage }).voyage);
        break;
      case 'charter-party':
        issues = validateCharterParty(extracted.fields, (context as { voyage: Voyage }).voyage);
        break;
      case 'letter-of-credit':
        issues = validateLetterOfCredit(extracted.fields, (context as { trade: Trade | undefined }).trade);
        break;
      case 'kyc-dossier':
        issues = validateKycDossier(extracted.fields);
        break;
    }

    if (confidence < LOW_CONFIDENCE_THRESHOLD) {
      issues.push({
        field: 'extraction',
        message: `Low-confidence extraction (${Math.round(confidence * 100)}%) — recommend manual verification`,
        severity: 'info',
      });
    }

    documentStore.finalize(id, extracted, confidence, statusFor(confidence, issues.filter((i) => i.severity !== 'info').length), issues);
  } catch (err) {
    console.error('[documents] LLM extraction failed:', err instanceof Error ? err.message : err);
    documentStore.finalize(id, ground.extracted, 0, 'needs-review', [
      { field: 'extraction', message: 'Automated extraction failed — showing the source document only. Review manually.', severity: 'warning' },
    ]);
  }
}

export function startDocumentEngine(): void {
  setInterval(() => {
    tick().catch((err) => console.error('[documents] tick failed:', err));
  }, clock.scaledInterval(TICK_MS));
}
