import type { Invoice } from 'shared';
import { db } from './db.js';

const MAX_ROWS = 500;

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  type: string;
  issuedAt: string;
  dueDate: string;
  deskId: string;
  counterpartyId: string;
  sourceTradeId: string | null;
  sourceVoyageId: string | null;
  currency: string;
  expectedAmountUsd: number;
  invoicedAmountUsd: number;
  paymentMethod: string;
  matchStatus: string;
  issuesJson: string;
  acknowledged: number;
  acknowledgedNote: string | null;
  paid: number;
  paidAt: string | null;
}

function toRow(inv: Invoice): InvoiceRow {
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    type: inv.type,
    issuedAt: inv.issuedAt,
    dueDate: inv.dueDate,
    deskId: inv.deskId,
    counterpartyId: inv.counterpartyId,
    sourceTradeId: inv.sourceTradeId,
    sourceVoyageId: inv.sourceVoyageId,
    currency: inv.currency,
    expectedAmountUsd: inv.expectedAmountUsd,
    invoicedAmountUsd: inv.invoicedAmountUsd,
    paymentMethod: inv.paymentMethod,
    matchStatus: inv.matchStatus,
    issuesJson: JSON.stringify(inv.issues),
    acknowledged: inv.acknowledged ? 1 : 0,
    acknowledgedNote: inv.acknowledgedNote,
    paid: inv.paid ? 1 : 0,
    paidAt: inv.paidAt,
  };
}

function fromRow(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    type: row.type as Invoice['type'],
    issuedAt: row.issuedAt,
    dueDate: row.dueDate,
    deskId: row.deskId as Invoice['deskId'],
    counterpartyId: row.counterpartyId,
    sourceTradeId: row.sourceTradeId,
    sourceVoyageId: row.sourceVoyageId,
    currency: row.currency as Invoice['currency'],
    expectedAmountUsd: row.expectedAmountUsd,
    invoicedAmountUsd: row.invoicedAmountUsd,
    paymentMethod: row.paymentMethod as Invoice['paymentMethod'],
    matchStatus: row.matchStatus as Invoice['matchStatus'],
    issues: JSON.parse(row.issuesJson),
    acknowledged: Boolean(row.acknowledged),
    acknowledgedNote: row.acknowledgedNote,
    paid: Boolean(row.paid),
    paidAt: row.paidAt,
  };
}

export function insert(inv: Invoice): void {
  const row = toRow(inv);
  db.prepare(
    `INSERT INTO invoices (id, invoiceNumber, type, issuedAt, dueDate, deskId, counterpartyId, sourceTradeId, sourceVoyageId, currency, expectedAmountUsd, invoicedAmountUsd, paymentMethod, matchStatus, issuesJson, acknowledged, acknowledgedNote, paid, paidAt)
     VALUES (@id, @invoiceNumber, @type, @issuedAt, @dueDate, @deskId, @counterpartyId, @sourceTradeId, @sourceVoyageId, @currency, @expectedAmountUsd, @invoicedAmountUsd, @paymentMethod, @matchStatus, @issuesJson, @acknowledged, @acknowledgedNote, @paid, @paidAt)`,
  ).run(row);

  const count = (db.prepare('SELECT COUNT(*) as n FROM invoices').get() as { n: number }).n;
  if (count > MAX_ROWS) {
    db.prepare('DELETE FROM invoices WHERE id IN (SELECT id FROM invoices ORDER BY issuedAt ASC LIMIT ?)').run(
      count - MAX_ROWS,
    );
  }
}

export function update(inv: Invoice): void {
  const row = toRow(inv);
  db.prepare(
    `UPDATE invoices SET acknowledged = @acknowledged, acknowledgedNote = @acknowledgedNote, paid = @paid, paidAt = @paidAt WHERE id = @id`,
  ).run(row);
}

export function getById(id: string): Invoice | undefined {
  const row = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as InvoiceRow | undefined;
  return row ? fromRow(row) : undefined;
}

export function list(): Invoice[] {
  const rows = db.prepare('SELECT * FROM invoices ORDER BY issuedAt DESC').all() as InvoiceRow[];
  return rows.map(fromRow);
}

export function hasInvoiceForTrade(tradeId: string): boolean {
  const row = db.prepare('SELECT 1 FROM invoices WHERE sourceTradeId = ? LIMIT 1').get(tradeId);
  return row !== undefined;
}

export function hasFreightInvoiceForVoyage(voyageId: string): boolean {
  const row = db.prepare("SELECT 1 FROM invoices WHERE sourceVoyageId = ? AND type = 'freight' LIMIT 1").get(voyageId);
  return row !== undefined;
}

export function hasDemurrageInvoiceForVoyage(voyageId: string): boolean {
  const row = db
    .prepare("SELECT 1 FROM invoices WHERE sourceVoyageId = ? AND type = 'demurrage' LIMIT 1")
    .get(voyageId);
  return row !== undefined;
}
