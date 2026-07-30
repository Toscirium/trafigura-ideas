import { resolveFrontMonthTickers, fetchPricesForTickers } from '../domain/massiveMarketData.js';

const POLL_MS = 60_000;
const FRONT_MONTH_REFRESH_MS = 6 * 60 * 60 * 1000; // 6h — front-month contracts roll roughly monthly

let resolvedTickers: Record<string, string> = {};
let lastResolvedAt = 0;
let priceCache: Record<string, number> = {};

export function getLivePrice(commodityId: string): number | undefined {
  return priceCache[commodityId];
}

async function ensureTickersResolved(): Promise<void> {
  if (Date.now() - lastResolvedAt < FRONT_MONTH_REFRESH_MS && Object.keys(resolvedTickers).length > 0) return;
  const next = await resolveFrontMonthTickers();
  if (Object.keys(next).length > 0) {
    resolvedTickers = next;
    lastResolvedAt = Date.now();
  }
}

async function poll(): Promise<void> {
  await ensureTickersResolved();
  const prices = await fetchPricesForTickers(resolvedTickers);
  if (Object.keys(prices).length > 0) {
    priceCache = { ...priceCache, ...prices };
  }
}

export function startMarketDataEngine(): void {
  if (!process.env.MASSIVE_API_KEY) {
    console.log('[market-data] MASSIVE_API_KEY not set — all commodities use simulated prices.');
    return;
  }

  poll().catch((err) => console.error('[market-data] initial poll failed:', err instanceof Error ? err.message : err));

  // Deliberately NOT scaled by clock.speed, same reasoning as the document engine: this
  // hits a real (potentially rate-limited) API, so fast-forwarding the demo must not
  // multiply real request volume.
  setInterval(() => {
    poll().catch((err) => console.error('[market-data] poll failed:', err instanceof Error ? err.message : err));
  }, POLL_MS);
}
