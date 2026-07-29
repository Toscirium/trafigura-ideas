import type { Contact, CounterpartyProfile, RelationshipNote } from 'shared';
import { db } from './db.js';

const PROFILE_COLUMNS: (keyof CounterpartyProfile)[] = [
  'counterpartyId',
  'creditLimitUsd',
  'kycStatus',
  'kycRenewalDate',
  'relationshipOwner',
  'onboardedAt',
  'updatedAt',
];

export function countProfiles(): number {
  const row = db.prepare('SELECT COUNT(*) as n FROM counterparty_profiles').get() as { n: number };
  return row.n;
}

export function listProfiles(): CounterpartyProfile[] {
  return db.prepare('SELECT * FROM counterparty_profiles').all() as CounterpartyProfile[];
}

export function getProfile(counterpartyId: string): CounterpartyProfile | undefined {
  return db.prepare('SELECT * FROM counterparty_profiles WHERE counterpartyId = ?').get(counterpartyId) as
    | CounterpartyProfile
    | undefined;
}

export function insertProfile(profile: CounterpartyProfile): void {
  const placeholders = PROFILE_COLUMNS.map((c) => `@${c}`).join(', ');
  db.prepare(`INSERT INTO counterparty_profiles (${PROFILE_COLUMNS.join(', ')}) VALUES (${placeholders})`).run(profile);
}

export function updateProfile(counterpartyId: string, patch: Partial<CounterpartyProfile>): CounterpartyProfile | undefined {
  const existing = getProfile(counterpartyId);
  if (!existing) return undefined;
  const merged: CounterpartyProfile = { ...existing, ...patch, counterpartyId, updatedAt: new Date().toISOString() };
  const assignments = PROFILE_COLUMNS.filter((c) => c !== 'counterpartyId')
    .map((c) => `${c} = @${c}`)
    .join(', ');
  db.prepare(`UPDATE counterparty_profiles SET ${assignments} WHERE counterpartyId = @counterpartyId`).run(merged);
  return merged;
}

export function listContacts(): Contact[] {
  return db.prepare('SELECT * FROM contacts').all() as Contact[];
}

export function listContactsForCounterparty(counterpartyId: string): Contact[] {
  return db.prepare('SELECT * FROM contacts WHERE counterpartyId = ?').all(counterpartyId) as Contact[];
}

export function insertContact(contact: Contact): void {
  db.prepare('INSERT INTO contacts (id, counterpartyId, name, role, email, phone) VALUES (@id, @counterpartyId, @name, @role, @email, @phone)').run(
    contact,
  );
}

export function deleteContact(id: string): void {
  db.prepare('DELETE FROM contacts WHERE id = ?').run(id);
}

export function listNotes(): RelationshipNote[] {
  return db.prepare('SELECT * FROM relationship_notes').all() as RelationshipNote[];
}

export function insertNote(note: RelationshipNote): void {
  db.prepare(
    'INSERT INTO relationship_notes (id, counterpartyId, author, body, createdAt) VALUES (@id, @counterpartyId, @author, @body, @createdAt)',
  ).run(note);
}
