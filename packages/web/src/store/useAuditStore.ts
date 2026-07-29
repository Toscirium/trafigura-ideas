import { create } from 'zustand';
import type { AuditLogEntry, ServerEvent } from 'shared';

interface AuditState {
  hydrated: boolean;
  entries: AuditLogEntry[];
  applyEvent: (event: ServerEvent) => void;
}

export const useAuditStore = create<AuditState>((set) => ({
  hydrated: false,
  entries: [],

  applyEvent: (event) =>
    set((state) => {
      switch (event.type) {
        case 'auditSnapshot':
          return { entries: event.payload.entries, hydrated: true };
        case 'auditAdded':
          return { entries: [event.payload, ...state.entries] };
        default:
          return state;
      }
    }),
}));
