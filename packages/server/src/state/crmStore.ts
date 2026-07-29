import { EventEmitter } from 'node:events';
import { nanoid } from 'nanoid';
import type {
  Contact,
  Counterparty,
  CounterpartyProfile,
  CrmSnapshotPayload,
  KycStatus,
  NewContactInput,
  NewNoteInput,
  RelationshipNote,
  UpdateProfileInput,
} from 'shared';
import * as crmRepo from '../db/crmRepo.js';
import { counterpartyStore } from './counterpartyStore.js';

const RELATIONSHIP_OWNERS = ['Sarah Chen', 'Marco Dupont', 'Aisha Rahman', 'Tom Whitfield'];
const CONTACT_ROLES = ['Head of Trading', 'Credit Manager', 'Operations Lead', 'Settlements'];

const CREDIT_LIMIT_RANGE: Record<string, [number, number]> = {
  A: [40_000_000, 65_000_000],
  B: [15_000_000, 28_000_000],
  C: [5_000_000, 11_000_000],
};

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function randomInRange([min, max]: [number, number]): number {
  return Math.round(min + Math.random() * (max - min));
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '.');
}

/** Seeds a default profile + contacts for one counterparty (startup seed, and cascade after a data import). */
function seedProfileFor(cp: Counterparty, index: number): void {
  const now = new Date();
  const onboardedAt = new Date(now.getTime() - (365 + index * 47) * 24 * 60 * 60 * 1000).toISOString();
  // A couple of counterparties get flagged KYC states so the roster has visible variety.
  const kycStatus: KycStatus = index === 2 ? 'pending' : index === 6 ? 'expired' : 'verified';
  const kycRenewalDate = new Date(
    now.getTime() + (kycStatus === 'expired' ? -30 : 180 + index * 10) * 24 * 60 * 60 * 1000,
  ).toISOString();

  crmRepo.insertProfile({
    counterpartyId: cp.id,
    creditLimitUsd: randomInRange(CREDIT_LIMIT_RANGE[cp.tier] ?? CREDIT_LIMIT_RANGE.C!),
    kycStatus,
    kycRenewalDate,
    relationshipOwner: pick(RELATIONSHIP_OWNERS),
    onboardedAt,
    updatedAt: onboardedAt,
  });

  const contactCount = 1 + (index % 2);
  for (let i = 0; i < contactCount; i++) {
    const role = CONTACT_ROLES[i % CONTACT_ROLES.length]!;
    const firstName = pick(['Alex', 'Jordan', 'Priya', 'Kenji', 'Fatima', 'Lucas', 'Nina', 'Omar']);
    const lastName = pick(['Reid', 'Okafor', 'Novak', 'Tan', 'Silva', 'Bergström']);
    crmRepo.insertContact({
      id: nanoid(10),
      counterpartyId: cp.id,
      name: `${firstName} ${lastName}`,
      role,
      email: `${slug(firstName)}.${slug(lastName)}@${slug(cp.name).replace(/\.+/g, '')}.com`,
      phone: `+${1 + (index % 9)} ${String(200 + index * 7).padStart(3, '0')}-555-${String(1000 + index * 37).slice(-4)}`,
    });
  }
}

function seedIfEmpty(): void {
  if (crmRepo.countProfiles() > 0) return;
  counterpartyStore.list().forEach(seedProfileFor);
}

class CrmStore extends EventEmitter {
  constructor() {
    super();
    seedIfEmpty();
    counterpartyStore.on('counterpartiesUpdate', (counterparties: Counterparty[]) => this.ensureProfilesFor(counterparties));
  }

  /** Creates default profiles/contacts for any counterparty that doesn't have one yet — keeps CRM in sync after a data import. */
  ensureProfilesFor(counterparties: Counterparty[]): void {
    counterparties.forEach((cp, index) => {
      if (!crmRepo.getProfile(cp.id)) seedProfileFor(cp, index);
    });
  }

  getProfile(counterpartyId: string): CounterpartyProfile | undefined {
    return crmRepo.getProfile(counterpartyId);
  }

  updateProfile(counterpartyId: string, patch: UpdateProfileInput): CounterpartyProfile | undefined {
    const updated = crmRepo.updateProfile(counterpartyId, patch);
    if (updated) this.emit('profileUpdate', updated);
    return updated;
  }

  addNote(counterpartyId: string, input: NewNoteInput): RelationshipNote {
    const note: RelationshipNote = {
      id: nanoid(10),
      counterpartyId,
      author: input.author,
      body: input.body,
      createdAt: new Date().toISOString(),
    };
    crmRepo.insertNote(note);
    this.emit('noteAdded', note);
    return note;
  }

  addContact(counterpartyId: string, input: NewContactInput): Contact[] {
    const contact: Contact = { id: nanoid(10), counterpartyId, ...input };
    crmRepo.insertContact(contact);
    const contacts = crmRepo.listContactsForCounterparty(counterpartyId);
    this.emit('contactsUpdate', { counterpartyId, contacts });
    return contacts;
  }

  removeContact(counterpartyId: string, contactId: string): Contact[] {
    crmRepo.deleteContact(contactId);
    const contacts = crmRepo.listContactsForCounterparty(counterpartyId);
    this.emit('contactsUpdate', { counterpartyId, contacts });
    return contacts;
  }

  snapshot(): CrmSnapshotPayload {
    return {
      profiles: crmRepo.listProfiles(),
      contacts: crmRepo.listContacts(),
      notes: crmRepo.listNotes(),
    };
  }
}

export const crmStore = new CrmStore();
