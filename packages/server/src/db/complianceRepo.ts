import type { CaseActivityEntry, ComplianceCase } from 'shared';
import { db } from './db.js';

const MAX_CASES = 300;
const MAX_ACTIVITY = 1000;

export function insertCase(c: ComplianceCase): void {
  db.prepare(
    `INSERT INTO compliance_cases (id, createdAt, updatedAt, entityType, entityId, entityName, listType, matchedName, matchScore, status, priority, assignedTo, relatedTradeId, relatedVoyageId)
     VALUES (@id, @createdAt, @updatedAt, @entityType, @entityId, @entityName, @listType, @matchedName, @matchScore, @status, @priority, @assignedTo, @relatedTradeId, @relatedVoyageId)`,
  ).run(c);

  const count = (db.prepare('SELECT COUNT(*) as n FROM compliance_cases').get() as { n: number }).n;
  if (count > MAX_CASES) {
    db.prepare(
      'DELETE FROM compliance_cases WHERE id IN (SELECT id FROM compliance_cases ORDER BY createdAt ASC LIMIT ?)',
    ).run(count - MAX_CASES);
  }
}

export function updateCase(c: ComplianceCase): void {
  db.prepare(
    `UPDATE compliance_cases SET updatedAt = @updatedAt, status = @status, assignedTo = @assignedTo WHERE id = @id`,
  ).run(c);
}

export function getCase(id: string): ComplianceCase | undefined {
  return db.prepare('SELECT * FROM compliance_cases WHERE id = ?').get(id) as ComplianceCase | undefined;
}

export function listCases(): ComplianceCase[] {
  return db.prepare('SELECT * FROM compliance_cases ORDER BY createdAt DESC').all() as ComplianceCase[];
}

export function insertActivity(entry: CaseActivityEntry): void {
  db.prepare(
    'INSERT INTO case_activity (id, caseId, author, action, body, createdAt) VALUES (@id, @caseId, @author, @action, @body, @createdAt)',
  ).run(entry);

  const count = (db.prepare('SELECT COUNT(*) as n FROM case_activity').get() as { n: number }).n;
  if (count > MAX_ACTIVITY) {
    db.prepare(
      'DELETE FROM case_activity WHERE id IN (SELECT id FROM case_activity ORDER BY createdAt ASC LIMIT ?)',
    ).run(count - MAX_ACTIVITY);
  }
}

export function listActivity(): CaseActivityEntry[] {
  return db.prepare('SELECT * FROM case_activity ORDER BY createdAt DESC').all() as CaseActivityEntry[];
}
