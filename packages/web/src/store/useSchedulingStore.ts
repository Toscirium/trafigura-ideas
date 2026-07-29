import { create } from 'zustand';
import type {
  NewVoyageInput,
  Port,
  PortCongestion,
  SchedulingSnapshotPayload,
  ServerEvent,
  Vessel,
  Voyage,
  VoyageReschedulePatch,
} from 'shared';
import { apiFetch } from '../api/client.js';

interface SchedulingState {
  hydrated: boolean;
  vessels: Vessel[];
  ports: Port[];
  voyages: Record<string, Voyage>;
  portCongestion: Record<string, PortCongestion>;
  applyEvent: (event: ServerEvent) => void;
  rescheduleVoyage: (id: string, patch: VoyageReschedulePatch) => Promise<void>;
  createVoyage: (input: NewVoyageInput) => Promise<void>;
}

function hydrate(payload: SchedulingSnapshotPayload) {
  const voyages: Record<string, Voyage> = {};
  for (const v of payload.voyages) voyages[v.id] = v;

  const portCongestion: Record<string, PortCongestion> = {};
  for (const c of payload.portCongestion) portCongestion[c.portId] = c;

  return {
    vessels: payload.vessels,
    ports: payload.ports,
    voyages,
    portCongestion,
    hydrated: true,
  };
}

export const useSchedulingStore = create<SchedulingState>((set, get) => ({
  hydrated: false,
  vessels: [],
  ports: [],
  voyages: {},
  portCongestion: {},

  applyEvent: (event) =>
    set((state) => {
      switch (event.type) {
        case 'schedulingSnapshot':
          return hydrate(event.payload);
        case 'voyageUpdate':
          return { voyages: { ...state.voyages, [event.payload.id]: event.payload } };
        case 'portCongestionUpdate':
          return { portCongestion: { ...state.portCongestion, [event.payload.portId]: event.payload } };
        default:
          return state;
      }
    }),

  rescheduleVoyage: async (id, patch) => {
    // Optimistic local shift so the drag/resize feels instant; the server echo
    // (voyageUpdate) overwrites with authoritative laytime/demurrage/P&L.
    const existing = get().voyages[id];
    if (existing) {
      set((state) => ({ voyages: { ...state.voyages, [id]: { ...existing, ...patch } } }));
    }
    await apiFetch(`/api/voyages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  createVoyage: async (input) => {
    await apiFetch(`/api/voyages`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
}));
