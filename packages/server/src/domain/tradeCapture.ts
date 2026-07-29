import { nanoid } from 'nanoid';
import type { NewTradeInput, Trade } from 'shared';
import { store } from '../state/store.js';
import { applyTrade } from '../state/positionAggregator.js';

/** Manual "fast deal entry" path — same downstream effects (position update, broadcast) as a simulated trade. */
export function captureTrade(input: NewTradeInput): Trade {
  const trade: Trade = {
    id: nanoid(10),
    timestamp: new Date().toISOString(),
    ...input,
  };
  store.addTrade(trade);
  applyTrade(trade);
  return trade;
}
