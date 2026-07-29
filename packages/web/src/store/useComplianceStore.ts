import { create } from 'zustand';
import type { CaseActivityEntry, CaseStatus, ComplianceCase, ComplianceSnapshotPayload, ServerEvent } from 'shared';
import { apiFetch } from '../api/client.js';

interface ComplianceState {
  hydrated: boolean;
  cases: Record<string, ComplianceCase>;
  activity: CaseActivityEntry[];
  applyEvent: (event: ServerEvent) => void;
  updateStatus: (id: string, status: CaseStatus, note?: string) => Promise<void>;
  assign: (id: string, assignedTo: string) => Promise<void>;
  addComment: (id: string, body: string) => Promise<void>;
}

function hydrate(payload: ComplianceSnapshotPayload) {
  const cases: Record<string, ComplianceCase> = {};
  for (const c of payload.cases) cases[c.id] = c;
  return { cases, activity: payload.activity, hydrated: true };
}

export const useComplianceStore = create<ComplianceState>((set) => ({
  hydrated: false,
  cases: {},
  activity: [],

  applyEvent: (event) =>
    set((state) => {
      switch (event.type) {
        case 'complianceSnapshot':
          return hydrate(event.payload);
        case 'caseUpdate':
          return { cases: { ...state.cases, [event.payload.id]: event.payload } };
        case 'caseActivityAdded':
          return { activity: [event.payload, ...state.activity] };
        default:
          return state;
      }
    }),

  updateStatus: async (id, status, note) => {
    await apiFetch(`/api/compliance/cases/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    });
  },

  assign: async (id, assignedTo) => {
    await apiFetch(`/api/compliance/cases/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ assignedTo }),
    });
  },

  addComment: async (id, body) => {
    await apiFetch(`/api/compliance/cases/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  },
}));
