import type { AuditLogEntry } from 'shared';
import { db } from './db.js';

const MAX_ROWS = 5000;

export function insertEntry(entry: AuditLogEntry): void {
  db.prepare(
    'INSERT INTO audit_log (id, timestamp, userId, username, role, action, entityType, entityId, details) VALUES (@id, @timestamp, @userId, @username, @role, @action, @entityType, @entityId, @details)',
  ).run(entry);

  const row = db.prepare('SELECT COUNT(*) as n FROM audit_log').get() as { n: number };
  if (row.n > MAX_ROWS) {
    db.prepare(
      'DELETE FROM audit_log WHERE id IN (SELECT id FROM audit_log ORDER BY timestamp ASC LIMIT ?)',
    ).run(row.n - MAX_ROWS);
  }
}

export function listEntries(limit = 500): AuditLogEntry[] {
  return db.prepare('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT ?').all(limit) as AuditLogEntry[];
}
