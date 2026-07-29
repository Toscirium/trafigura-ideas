import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import type { DocumentExtracted, DocumentType } from 'shared';

const MODEL = 'claude-opus-5';

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

const billOfLadingSchema = z.object({
  vesselName: z.string(),
  shipper: z.string(),
  consignee: z.string(),
  cargoDescription: z.string(),
  cargoQuantity: z.number(),
  cargoUnit: z.string(),
  portOfLoading: z.string(),
  portOfDischarge: z.string(),
  dateOfIssue: z.string().describe('ISO 8601 date'),
  confidence: z.number().describe('Your confidence 0.0-1.0 that every field was extracted correctly from the text'),
});

const letterOfCreditSchema = z.object({
  lcNumber: z.string(),
  issuingBank: z.string(),
  applicant: z.string(),
  beneficiary: z.string(),
  amountUsd: z.number(),
  expiryDate: z.string().describe('ISO 8601 date'),
  latestShipmentDate: z.string().describe('ISO 8601 date'),
  commodityDescription: z.string(),
  confidence: z.number().describe('Your confidence 0.0-1.0 that every field was extracted correctly from the text'),
});

const charterPartySchema = z.object({
  vesselName: z.string(),
  charterer: z.string(),
  owner: z.string(),
  laycanStart: z.string().describe('ISO 8601 date'),
  laycanEnd: z.string().describe('ISO 8601 date'),
  freightRateUsd: z.number(),
  demurrageRateUsdPerDay: z.number(),
  loadPort: z.string(),
  dischargePort: z.string(),
  confidence: z.number().describe('Your confidence 0.0-1.0 that every field was extracted correctly from the text'),
});

const kycDossierSchema = z.object({
  counterpartyName: z.string(),
  jurisdiction: z.string(),
  beneficialOwner: z.string(),
  sanctionsListsChecked: z.array(z.string()),
  riskRating: z.enum(['low', 'medium', 'high']),
  confidence: z.number().describe('Your confidence 0.0-1.0 that every field was extracted correctly from the text'),
});

const SCHEMAS = {
  'bill-of-lading': billOfLadingSchema,
  'letter-of-credit': letterOfCreditSchema,
  'charter-party': charterPartySchema,
  'kyc-dossier': kycDossierSchema,
} as const;

const DOC_TYPE_LABEL: Record<DocumentType, string> = {
  'bill-of-lading': 'bill of lading',
  'letter-of-credit': 'letter of credit',
  'charter-party': 'charter party',
  'kyc-dossier': 'KYC dossier',
};

export interface ExtractionResult {
  extracted: DocumentExtracted;
  confidence: number;
}

/**
 * Parses a raw trade-finance/shipping document into structured fields via Claude —
 * this is the real extraction step; nothing here knows what the "correct" answer is.
 * Business validation (comparing the result against the ETRM) happens separately in
 * documentIntel.ts's validate* functions, on whatever comes back here.
 */
export async function extractDocumentFields(docType: DocumentType, rawText: string): Promise<ExtractionResult> {
  const schema = SCHEMAS[docType];
  const response = await getClient().messages.parse({
    model: MODEL,
    max_tokens: 1024,
    thinking: { type: 'disabled' },
    output_config: {
      effort: 'low',
      format: zodOutputFormat(schema),
    },
    system:
      'You extract structured data from trade-finance and shipping documents for a middle-office system. ' +
      'Transcribe exactly what is written in the document — do not correct, infer, or "fix" values that look wrong. ' +
      'Report your genuine confidence; do not default to a high number.',
    messages: [
      {
        role: 'user',
        content: `Extract the fields from this ${DOC_TYPE_LABEL[docType]}:\n\n${rawText}`,
      },
    ],
  });

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new Error(`Claude did not return parseable structured output (stop_reason: ${response.stop_reason})`);
  }

  const { confidence, ...fields } = parsed;
  return {
    extracted: { docType, fields } as DocumentExtracted,
    confidence: Math.max(0, Math.min(1, confidence)),
  };
}
