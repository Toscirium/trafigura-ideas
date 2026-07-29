import type { DocumentExtracted, DocumentStatus, DocumentValidationIssue, TradeDocument } from 'shared';
import { db } from './db.js';

const MAX_ROWS = 300;

interface DocumentRow {
  id: string;
  receivedAt: string;
  fileName: string;
  docType: string;
  counterpartyId: string | null;
  voyageId: string | null;
  rawText: string;
  extractedJson: string;
  confidence: number | null;
  status: string;
  issuesJson: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

function toRow(doc: TradeDocument): DocumentRow {
  return {
    id: doc.id,
    receivedAt: doc.receivedAt,
    fileName: doc.fileName,
    docType: doc.docType,
    counterpartyId: doc.counterpartyId,
    voyageId: doc.voyageId,
    rawText: doc.rawText,
    extractedJson: JSON.stringify(doc.extracted),
    confidence: doc.confidence,
    status: doc.status,
    issuesJson: JSON.stringify(doc.issues),
    reviewedBy: doc.reviewedBy,
    reviewedAt: doc.reviewedAt,
  };
}

function fromRow(row: DocumentRow): TradeDocument {
  return {
    id: row.id,
    receivedAt: row.receivedAt,
    fileName: row.fileName,
    docType: row.docType as TradeDocument['docType'],
    counterpartyId: row.counterpartyId,
    voyageId: row.voyageId,
    rawText: row.rawText,
    extracted: JSON.parse(row.extractedJson),
    confidence: row.confidence,
    status: row.status as TradeDocument['status'],
    issues: JSON.parse(row.issuesJson),
    reviewedBy: row.reviewedBy,
    reviewedAt: row.reviewedAt,
  };
}

export function insert(doc: TradeDocument): void {
  const row = toRow(doc);
  db.prepare(
    `INSERT INTO documents (id, receivedAt, fileName, docType, counterpartyId, voyageId, rawText, extractedJson, confidence, status, issuesJson, reviewedBy, reviewedAt)
     VALUES (@id, @receivedAt, @fileName, @docType, @counterpartyId, @voyageId, @rawText, @extractedJson, @confidence, @status, @issuesJson, @reviewedBy, @reviewedAt)`,
  ).run(row);

  const count = (db.prepare('SELECT COUNT(*) as n FROM documents').get() as { n: number }).n;
  if (count > MAX_ROWS) {
    db.prepare('DELETE FROM documents WHERE id IN (SELECT id FROM documents ORDER BY receivedAt ASC LIMIT ?)').run(
      count - MAX_ROWS,
    );
  }
}

export function update(doc: TradeDocument): void {
  const row = toRow(doc);
  db.prepare(
    `UPDATE documents SET status = @status, reviewedBy = @reviewedBy, reviewedAt = @reviewedAt WHERE id = @id`,
  ).run(row);
}

/** Called once the LLM extraction result (or a fallback) is available for a 'processing' document. */
export function finalize(
  id: string,
  extracted: DocumentExtracted,
  confidence: number,
  status: DocumentStatus,
  issues: DocumentValidationIssue[],
): void {
  db.prepare('UPDATE documents SET extractedJson = @extractedJson, confidence = @confidence, status = @status, issuesJson = @issuesJson WHERE id = @id').run(
    {
      id,
      extractedJson: JSON.stringify(extracted),
      confidence,
      status,
      issuesJson: JSON.stringify(issues),
    },
  );
}

export function getById(id: string): TradeDocument | undefined {
  const row = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as DocumentRow | undefined;
  return row ? fromRow(row) : undefined;
}

export function list(): TradeDocument[] {
  const rows = db.prepare('SELECT * FROM documents ORDER BY receivedAt DESC').all() as DocumentRow[];
  return rows.map(fromRow);
}
