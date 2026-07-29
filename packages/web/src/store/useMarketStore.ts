import { create } from 'zustand';
import type {
  Commodity,
  Counterparty,
  Desk,
  MarketPriceTick,
  Position,
  ServerEvent,
  SnapshotPayload,
  Trade,
} from 'shared';

const TRADE_BUFFER_SIZE = 200;

interface MarketState {
  connected: boolean;
  hydrated: boolean;
  desks: Desk[];
  commodities: Commodity[];
  counterparties: Counterparty[];
  positions: Record<string, Position>;
  prices: Record<string, MarketPriceTick>;
  trades: Trade[];
  setConnected: (connected: boolean) => void;
  applyEvent: (event: ServerEvent) => void;
}

function hydrate(payload: SnapshotPayload) {
  const positions: Record<string, Position> = {};
  for (const p of payload.positions) positions[p.key] = p;

  const prices: Record<string, MarketPriceTick> = {};
  for (const t of payload.prices) prices[t.commodityId] = t;

  return {
    desks: payload.desks,
    commodities: payload.commodities,
    counterparties: payload.counterparties,
    positions,
    prices,
    hydrated: true,
  };
}

export const useMarketStore = create<MarketState>((set) => ({
  connected: false,
  hydrated: false,
  desks: [],
  commodities: [],
  counterparties: [],
  positions: {},
  prices: {},
  trades: [],

  setConnected: (connected) => set({ connected }),

  applyEvent: (event) =>
    set((state) => {
      switch (event.type) {
        case 'snapshot':
          return hydrate(event.payload);
        case 'trade': {
          const trades = [...state.trades, event.payload];
          if (trades.length > TRADE_BUFFER_SIZE) trades.shift();
          return { trades };
        }
        case 'priceTick':
          return { prices: { ...state.prices, [event.payload.commodityId]: event.payload } };
        case 'positionUpdate':
          return { positions: { ...state.positions, [event.payload.key]: event.payload } };
        case 'counterpartiesUpdate':
          return { counterparties: event.payload };
        default:
          return state;
      }
    }),
}));
