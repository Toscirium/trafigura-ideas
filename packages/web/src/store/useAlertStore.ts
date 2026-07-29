import { create } from 'zustand';
import type { AlertItem, ServerEvent } from 'shared';

const MAX_ALERTS = 200;

interface AlertState {
  hydrated: boolean;
  alerts: AlertItem[];
  readIds: Record<string, true>;
  applyEvent: (event: ServerEvent) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  hydrated: false,
  alerts: [],
  readIds: {},

  applyEvent: (event) =>
    set((state) => {
      switch (event.type) {
        case 'alertSnapshot':
          return { alerts: event.payload.alerts, hydrated: true };
        case 'alertCreated': {
          const alerts = [event.payload, ...state.alerts];
          if (alerts.length > MAX_ALERTS) alerts.length = MAX_ALERTS;
          return { alerts };
        }
        default:
          return state;
      }
    }),

  markRead: (id) => set((state) => ({ readIds: { ...state.readIds, [id]: true } })),
  markAllRead: () =>
    set((state) => ({
      readIds: Object.fromEntries(state.alerts.map((a) => [a.id, true as const])),
    })),
}));
