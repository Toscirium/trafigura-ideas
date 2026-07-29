import { create } from 'zustand';
import type { DocumentIntelSnapshotPayload, ReviewDocumentInput, ServerEvent, TradeDocument } from 'shared';
import { apiFetch } from '../api/client.js';

interface DocumentState {
  hydrated: boolean;
  documents: Record<string, TradeDocument>;
  applyEvent: (event: ServerEvent) => void;
  reviewDocument: (id: string, input: ReviewDocumentInput) => Promise<void>;
}

function hydrate(payload: DocumentIntelSnapshotPayload) {
  const documents: Record<string, TradeDocument> = {};
  for (const d of payload.documents) documents[d.id] = d;
  return { documents, hydrated: true };
}

export const useDocumentStore = create<DocumentState>((set) => ({
  hydrated: false,
  documents: {},

  applyEvent: (event) =>
    set((state) => {
      switch (event.type) {
        case 'documentSnapshot':
          return hydrate(event.payload);
        case 'documentUpdate':
          return { documents: { ...state.documents, [event.payload.id]: event.payload } };
        default:
          return state;
      }
    }),

  reviewDocument: async (id, input) => {
    await apiFetch(`/api/documents/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },
}));
