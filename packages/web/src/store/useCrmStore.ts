import { create } from 'zustand';
import type {
  Contact,
  CounterpartyProfile,
  CrmSnapshotPayload,
  NewContactInput,
  NewNoteInput,
  RelationshipNote,
  ServerEvent,
  UpdateProfileInput,
} from 'shared';
import { apiFetch } from '../api/client.js';

interface CrmState {
  hydrated: boolean;
  profiles: Record<string, CounterpartyProfile>;
  contacts: Record<string, Contact[]>;
  notes: Record<string, RelationshipNote[]>;
  applyEvent: (event: ServerEvent) => void;
  updateProfile: (counterpartyId: string, patch: UpdateProfileInput) => Promise<void>;
  addNote: (counterpartyId: string, input: NewNoteInput) => Promise<void>;
  addContact: (counterpartyId: string, input: NewContactInput) => Promise<void>;
  removeContact: (counterpartyId: string, contactId: string) => Promise<void>;
}

function groupByCounterparty<T extends { counterpartyId: string }>(items: T[]): Record<string, T[]> {
  const map: Record<string, T[]> = {};
  for (const item of items) {
    (map[item.counterpartyId] ??= []).push(item);
  }
  return map;
}

function hydrate(payload: CrmSnapshotPayload) {
  const profiles: Record<string, CounterpartyProfile> = {};
  for (const p of payload.profiles) profiles[p.counterpartyId] = p;
  return {
    profiles,
    contacts: groupByCounterparty(payload.contacts),
    notes: groupByCounterparty(payload.notes),
    hydrated: true,
  };
}

export const useCrmStore = create<CrmState>((set) => ({
  hydrated: false,
  profiles: {},
  contacts: {},
  notes: {},

  applyEvent: (event) =>
    set((state) => {
      switch (event.type) {
        case 'crmSnapshot':
          return hydrate(event.payload);
        case 'profileUpdate':
          return { profiles: { ...state.profiles, [event.payload.counterpartyId]: event.payload } };
        case 'noteAdded': {
          const existing = state.notes[event.payload.counterpartyId] ?? [];
          return { notes: { ...state.notes, [event.payload.counterpartyId]: [...existing, event.payload] } };
        }
        case 'contactsUpdate':
          return { contacts: { ...state.contacts, [event.payload.counterpartyId]: event.payload.contacts } };
        default:
          return state;
      }
    }),

  updateProfile: async (counterpartyId, patch) => {
    await apiFetch(`/api/crm/counterparties/${counterpartyId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  addNote: async (counterpartyId, input) => {
    await apiFetch(`/api/crm/counterparties/${counterpartyId}/notes`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  addContact: async (counterpartyId, input) => {
    await apiFetch(`/api/crm/counterparties/${counterpartyId}/contacts`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  removeContact: async (counterpartyId, contactId) => {
    await apiFetch(`/api/crm/counterparties/${counterpartyId}/contacts/${contactId}`, {
      method: 'DELETE',
    });
  },
}));
