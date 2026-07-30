import { COMMODITIES, LIVE_PRICE_COMMODITY_IDS } from 'shared';
import type { MarketPriceTick } from 'shared';
import { store } from '../state/store.js';
import { recalcForCommodity } from '../state/positionAggregator.js';
import { clock } from './clock.js';
import { getLivePrice } from './marketDataEngine.js';

const TICK_MS = 1500;
const MEAN_REVERSION = 0.01;

function gaussianRandom(): number {
  // Box-Muller transform, standard normal.
  const u1 = Math.random() || 1e-9;
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function currentPrice(commodityId: string, basePrice: number): number {
  return store.prices.get(commodityId)?.price ?? basePrice;
}

function tick(): void {
  if (!clock.running) return;

  for (const commodity of COMMODITIES) {
    const prev = currentPrice(commodity.id, commodity.basePrice);
    const live = LIVE_PRICE_COMMODITY_IDS.includes(commodity.id) ? getLivePrice(commodity.id) : undefined;

    let next: number;
    if (live !== undefined) {
      next = live;
    } else {
      const randomStep = prev * commodity.volatility * gaussianRandom();
      const reversion = (commodity.basePrice - prev) * MEAN_REVERSION;
      next = Math.max(0.01, prev + randomStep + reversion);
    }

    const priceTick: MarketPriceTick = {
      commodityId: commodity.id,
      price: next,
      change: next - prev,
      changePct: prev === 0 ? 0 : (next - prev) / prev,
      timestamp: new Date().toISOString(),
    };

    store.updatePrice(priceTick);
    recalcForCommodity(commodity.id, next);
  }
}

export function startMarketEngine(): void {
  // Seed initial prices immediately so the snapshot isn't empty on first connect.
  for (const commodity of COMMODITIES) {
    store.updatePrice({
      commodityId: commodity.id,
      price: commodity.basePrice,
      change: 0,
      changePct: 0,
      timestamp: new Date().toISOString(),
    });
  }

  setInterval(() => tick(), clock.scaledInterval(TICK_MS));
}
