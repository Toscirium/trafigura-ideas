import { create } from 'zustand';
import type { Invoice, ServerEvent, SettlementSnapshotPayload } from 'shared';
import { apiFetch } from '../api/client.js';

interface SettlementState {
  hydrated: boolean;
  invoices: Record<string, Invoice>;
  applyEvent: (event: ServerEvent) => void;
  acknowledgeInvoice: (id: string, note?: string) => Promise<void>;
  markPaid: (id: string) => Promise<void>;
}

function hydrate(payload: SettlementSnapshotPayload) {
  const invoices: Record<string, Invoice> = {};
  for (const i of payload.invoices) invoices[i.id] = i;
  return { invoices, hydrated: true };
}

export const useSettlementStore = create<SettlementState>((set) => ({
  hydrated: false,
  invoices: {},

  applyEvent: (event) =>
    set((state) => {
      switch (event.type) {
        case 'settlementSnapshot':
          return hydrate(event.payload);
        case 'invoiceUpdate':
          return { invoices: { ...state.invoices, [event.payload.id]: event.payload } };
        default:
          return state;
      }
    }),

  acknowledgeInvoice: async (id, note) => {
    await apiFetch(`/api/invoices/${id}/acknowledge`, {
      method: 'PATCH',
      body: JSON.stringify({ note }),
    });
  },

  markPaid: async (id) => {
    await apiFetch(`/api/invoices/${id}/pay`, { method: 'PATCH' });
  },
}));
