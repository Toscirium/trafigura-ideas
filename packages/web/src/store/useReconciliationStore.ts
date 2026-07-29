import { create } from 'zustand';
import type {
  CaptureTradeRequest,
  CreditCheckResult,
  ReconciliationSnapshotPayload,
  ServerEvent,
  Trade,
  TradeConfirmation,
} from 'shared';
import { apiFetch } from '../api/client.js';

export type CaptureTradeResult = { ok: true; trade: Trade } | { ok: false; check: CreditCheckResult };

interface ReconciliationState {
  hydrated: boolean;
  confirmations: Record<string, TradeConfirmation>;
  applyEvent: (event: ServerEvent) => void;
  resolveBreak: (id: string, note?: string) => Promise<void>;
  captureTrade: (input: CaptureTradeRequest) => Promise<CaptureTradeResult>;
}

function hydrate(payload: ReconciliationSnapshotPayload) {
  const confirmations: Record<string, TradeConfirmation> = {};
  for (const c of payload.confirmations) confirmations[c.id] = c;
  return { confirmations, hydrated: true };
}

export const useReconciliationStore = create<ReconciliationState>((set) => ({
  hydrated: false,
  confirmations: {},

  applyEvent: (event) =>
    set((state) => {
      switch (event.type) {
        case 'reconciliationSnapshot':
          return hydrate(event.payload);
        case 'confirmationUpdate':
          return { confirmations: { ...state.confirmations, [event.payload.id]: event.payload } };
        default:
          return state;
      }
    }),

  resolveBreak: async (id, note) => {
    await apiFetch(`/api/confirmations/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ note }),
    });
  },

  captureTrade: async (input) => {
    const res = await apiFetch(`/api/trades`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    const body = await res.json();
    if (res.status === 409) {
      return { ok: false, check: body.check as CreditCheckResult };
    }
    return { ok: true, trade: body as Trade };
  },
}));
