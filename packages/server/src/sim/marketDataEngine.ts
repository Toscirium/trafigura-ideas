import type { MarketPriceTick } from 'shared';
import { resolveFrontMonthTickers, fetchPricesForTickers } from '../domain/massiveMarketData.js';
import { startOilPriceApiPolling } from '../domain/oilPriceApiData.js';
import { store } from '../state/store.js';
import { recalcForCommodity } from '../state/positionAggregator.js';

const MASSIVE_POLL_MS = 60_000;
const FRONT_MONTH_REFRESH_MS = 6 * 60 * 60 * 1000; // 6h — front-month contracts roll roughly monthly

let resolvedTickers: Record<string, string> = {};
let lastResolvedAt = 0;

/** Applies freshly-fetched real prices to the store, computing change/changePct against
 *  whatever price was previously shown (which may itself be a stale real price — we only
 *  ever move this forward on an actual fetch, never on a timer). */
function applyPrices(prices: Record<string, number>, source: MarketPriceTick['source']): void {
  for (const [commodityId, price] of Object.entries(prices)) {
    const prev = store.prices.get(commodityId)?.price ?? price;
    const tick: MarketPriceTick = {
      commodityId,
      price,
      change: price - prev,
      changePct: prev === 0 ? 0 : (price - prev) / prev,
      timestamp: new Date().toISOString(),
      source,
    };
    store.updatePrice(tick);
    recalcForCommodity(commodityId, price);
  }
}

async function ensureTickersResolved(): Promise<void> {
  if (Date.now() - lastResolvedAt < FRONT_MONTH_REFRESH_MS && Object.keys(resolvedTickers).length > 0) return;
  const next = await resolveFrontMonthTickers();
  if (Object.keys(next).length > 0) {
    resolvedTickers = next;
    lastResolvedAt = Date.now();
  }
}

async function pollMassive(): Promise<void> {
  await ensureTickersResolved();
  const prices = await fetchPricesForTickers(resolvedTickers);
  applyPrices(prices, 'massive');
}

function startMassivePolling(): void {
  if (!process.env.MASSIVE_API_KEY) {
    console.log('[market-data] MASSIVE_API_KEY not set — Brent, WTI, Copper, Aluminium, Zinc, and LNG Europe will have no price source.');
    return;
  }

  pollMassive().catch((err) => console.error('[market-data] initial Massive poll failed:', err instanceof Error ? err.message : err));

  // Deliberately NOT scaled by clock.speed, same reasoning as the document engine: this
  // hits a real (potentially rate-limited) API, so fast-forwarding the demo must not
  // multiply real request volume.
  setInterval(() => {
    pollMassive().catch((err) => console.error('[market-data] Massive poll failed:', err instanceof Error ? err.message : err));
  }, MASSIVE_POLL_MS);
}

export function startMarketDataEngine(): void {
  startMassivePolling();
  startOilPriceApiPolling((prices) => applyPrices(prices, 'oilpriceapi'));
}
