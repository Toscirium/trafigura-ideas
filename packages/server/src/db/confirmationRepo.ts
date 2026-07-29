import type { TradeConfirmation } from 'shared';
import { db } from './db.js';

const MAX_ROWS = 500;

interface ConfirmationRow {
  id: string;
  channel: string;
  receivedAt: string;
  rawText: string;
  extractedJson: string;
  matchedTradeId: string | null;
  status: string;
  breaksJson: string;
  resolved: number;
  resolutionNote: string | null;
  resolvedAt: string | null;
}

function toRow(c: TradeConfirmation): ConfirmationRow {
  return {
    id: c.id,
    channel: c.channel,
    receivedAt: c.receivedAt,
    rawText: c.rawText,
    extractedJson: JSON.stringify(c.extracted),
    matchedTradeId: c.matchedTradeId,
    status: c.status,
    breaksJson: JSON.stringify(c.breaks),
    resolved: c.resolved ? 1 : 0,
    resolutionNote: c.resolutionNote,
    resolvedAt: c.resolvedAt,
  };
}

function fromRow(row: ConfirmationRow): TradeConfirmation {
  return {
    id: row.id,
    channel: row.channel as TradeConfirmation['channel'],
    receivedAt: row.receivedAt,
    rawText: row.rawText,
    extracted: JSON.parse(row.extractedJson),
    matchedTradeId: row.matchedTradeId,
    status: row.status as TradeConfirmation['status'],
    breaks: JSON.parse(row.breaksJson),
    resolved: Boolean(row.resolved),
    resolutionNote: row.resolutionNote,
    resolvedAt: row.resolvedAt,
  };
}

export function insert(c: TradeConfirmation): void {
  const row = toRow(c);
  db.prepare(
    `INSERT INTO confirmations (id, channel, receivedAt, rawText, extractedJson, matchedTradeId, status, breaksJson, resolved, resolutionNote, resolvedAt)
     VALUES (@id, @channel, @receivedAt, @rawText, @extractedJson, @matchedTradeId, @status, @breaksJson, @resolved, @resolutionNote, @resolvedAt)`,
  ).run(row);

  const count = (db.prepare('SELECT COUNT(*) as n FROM confirmations').get() as { n: number }).n;
  if (count > MAX_ROWS) {
    db.prepare('DELETE FROM confirmations WHERE id IN (SELECT id FROM confirmations ORDER BY receivedAt ASC LIMIT ?)').run(
      count - MAX_ROWS,
    );
  }
}

export function update(c: TradeConfirmation): void {
  const row = toRow(c);
  db.prepare(
    'UPDATE confirmations SET resolved = @resolved, resolutionNote = @resolutionNote, resolvedAt = @resolvedAt WHERE id = @id',
  ).run(row);
}

export function getById(id: string): TradeConfirmation | undefined {
  const row = db.prepare('SELECT * FROM confirmations WHERE id = ?').get(id) as ConfirmationRow | undefined;
  return row ? fromRow(row) : undefined;
}

export function list(): TradeConfirmation[] {
  const rows = db.prepare('SELECT * FROM confirmations ORDER BY receivedAt DESC').all() as ConfirmationRow[];
  return rows.map(fromRow);
}
