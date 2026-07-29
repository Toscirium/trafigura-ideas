import { nanoid } from 'nanoid';
import { COMMODITIES, commoditiesForDesk, DESKS } from 'shared';
import type { Trade, TradeSide } from 'shared';
import { store } from '../state/store.js';
import { counterpartyStore } from '../state/counterpartyStore.js';
import { applyTrade } from '../state/positionAggregator.js';
import { clock } from './clock.js';

const MIN_INTERVAL_MS = 800;
const MAX_INTERVAL_MS = 4000;
const WHALE_TRADE_CHANCE = 1 / 20;

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function randomVolume(commodity: (typeof COMMODITIES)[number]): number {
  const base = commodity.unit === 'MMBtu' ? 50_000 : commodity.unit === 'bbl' ? 20_000 : 500;
  const size = base * (0.3 + Math.random() * 1.2);
  const isWhale = Math.random() < WHALE_TRADE_CHANCE;
  return Math.round(size * (isWhale ? 5 + Math.random() * 5 : 1));
}

function generateTrade(): Trade {
  const desk = pick(DESKS);
  const commodity = pick(commoditiesForDesk(desk.id));
  const counterparty = pick(counterpartyStore.list());
  const side: TradeSide = Math.random() < 0.5 ? 'BUY' : 'SELL';
  const marketPrice = store.prices.get(commodity.id)?.price ?? commodity.basePrice;
  const spread = marketPrice * 0.001 * (Math.random() * 2 - 1);

  return {
    id: nanoid(10),
    timestamp: new Date().toISOString(),
    deskId: desk.id,
    commodityId: commodity.id,
    counterpartyId: counterparty.id,
    side,
    volume: randomVolume(commodity),
    price: Math.max(0.01, marketPrice + spread),
  };
}

function scheduleNext(): void {
  const delay = clock.scaledInterval(MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS));
  setTimeout(() => {
    if (clock.running) {
      const trade = generateTrade();
      store.addTrade(trade);
      applyTrade(trade);
    }
    scheduleNext();
  }, delay);
}

export function startTradeEngine(): void {
  scheduleNext();
}
