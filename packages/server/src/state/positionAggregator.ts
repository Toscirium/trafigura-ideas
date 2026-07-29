import { positionKey } from 'shared';
import type { Position, Trade } from 'shared';
import { store } from './store.js';

const positionsByCommodity = new Map<string, Set<string>>();

function indexPosition(position: Position): void {
  let keys = positionsByCommodity.get(position.commodityId);
  if (!keys) {
    keys = new Set();
    positionsByCommodity.set(position.commodityId, keys);
  }
  keys.add(position.key);
}

export function applyTrade(trade: Trade): void {
  const key = positionKey(trade.deskId, trade.commodityId, trade.counterpartyId);
  const existing = store.positions.get(key);
  const signedVolume = trade.side === 'BUY' ? trade.volume : -trade.volume;

  const prevNet = existing?.netVolume ?? 0;
  const prevGross = existing?.grossVolume ?? 0;
  const prevAvgPrice = existing?.avgPrice ?? trade.price;

  const newNet = prevNet + signedVolume;
  const newGross = prevGross + trade.volume;

  // Volume-weighted average price, tracked on gross traded volume so it stays
  // stable even as net position crosses zero (flips from long to short).
  const newAvgPrice = (prevAvgPrice * prevGross + trade.price * trade.volume) / newGross;

  const lastMarketPrice = store.prices.get(trade.commodityId)?.price ?? trade.price;

  const position: Position = {
    key,
    deskId: trade.deskId,
    commodityId: trade.commodityId,
    counterpartyId: trade.counterpartyId,
    netVolume: newNet,
    grossVolume: newGross,
    avgPrice: newAvgPrice,
    lastMarketPrice,
    mtmPnl: (lastMarketPrice - newAvgPrice) * newNet,
    tradeCount: (existing?.tradeCount ?? 0) + 1,
    updatedAt: trade.timestamp,
  };

  indexPosition(position);
  store.upsertPosition(position);
}

export function recalcForCommodity(commodityId: string, price: number): void {
  const keys = positionsByCommodity.get(commodityId);
  if (!keys) return;

  for (const key of keys) {
    const position = store.positions.get(key);
    if (!position) continue;
    const updated: Position = {
      ...position,
      lastMarketPrice: price,
      mtmPnl: (price - position.avgPrice) * position.netVolume,
      updatedAt: new Date().toISOString(),
    };
    store.upsertPosition(updated);
  }
}
