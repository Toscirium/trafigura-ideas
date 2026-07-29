import type { DocumentStatus, DocumentType, TradeDocument } from 'shared';

export const DOC_TYPE_LABEL: Record<DocumentType, string> = {
  'bill-of-lading': 'Bill of Lading',
  'letter-of-credit': 'Letter of Credit',
  'charter-party': 'Charter Party',
  'kyc-dossier': 'KYC Dossier',
};

export const DOC_STATUS_LABEL: Record<DocumentStatus, string> = {
  processing: 'Extracting…',
  'needs-review': 'Needs review',
  validated: 'Validated',
  rejected: 'Rejected',
};

export function sortByReceivedDesc(documents: TradeDocument[]): TradeDocument[] {
  return [...documents].sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt));
}

export function documentSummary(document: TradeDocument): string {
  if (!document.extracted) return 'Extracting with Claude…';

  switch (document.extracted.docType) {
    case 'bill-of-lading':
      return `${document.extracted.fields.cargoQuantity.toLocaleString()} ${document.extracted.fields.cargoUnit} · ${document.extracted.fields.vesselName}`;
    case 'letter-of-credit':
      return `$${document.extracted.fields.amountUsd.toLocaleString()} · ${document.extracted.fields.issuingBank}`;
    case 'charter-party':
      return `${document.extracted.fields.vesselName} · $${document.extracted.fields.freightRateUsd.toLocaleString()}`;
    case 'kyc-dossier':
      return `${document.extracted.fields.riskRating.toUpperCase()} risk · ${document.extracted.fields.jurisdiction}`;
  }
}
