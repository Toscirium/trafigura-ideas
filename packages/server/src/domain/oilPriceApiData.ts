const BASE_URL = 'https://api.oilpriceapi.com/v1';

/**
 * commodityId -> patterns used to find the matching instrument in oilpriceapi.com's catalog
 * (GET /v1/commodities). Massive already covers BRENT, WTI, COPPER, ALUMINIUM, ZINC, LNG-EU
 * with real futures data (see massiveMarketData.ts) — this fills the remaining crude blend
 * (Dubai) plus fuel oil and Asian LNG, which oilpriceapi.com prices as spot/index series
 * rather than futures. Codes are discovered at runtime rather than hardcoded because the
 * exact catalog codes weren't verifiable at integration time (see resolveCommodityCodes doc).
 */
const OILPRICEAPI_MATCH: Record<string, RegExp[]> = {
  DUBAI: [/\bdubai\b/i],
  HSFO: [/high[\s-]*sulphur|high[\s-]*sulfur/i, /\bhsfo\b/i, /380\s*cst/i],
  VLSFO: [/very[\s-]*low[\s-]*sulphur|very[\s-]*low[\s-]*sulfur/i, /\bvlsfo\b/i],
  'LNG-ASIA': [/\bjkm\b/i, /japan[\s-]*korea[\s-]*marker/i, /lng\s*asia/i],
};

// Free tier is 200 requests/month. One poll = one /prices/latest call (codes are
// comma-separated into a single request) plus, rarely, one /commodities call for code
// resolution (cached for a week). Every 6h = 4 polls/day ≈ 120/month, leaving headroom.
const POLL_MS = 6 * 60 * 60 * 1000;
const CODE_REFRESH_MS = 7 * 24 * 60 * 60 * 1000;

interface OilPriceApiCommodity {
  code: string;
  name: string;
  category?: string;
  currency?: string;
}

interface CommoditiesResponse {
  status?: string;
  data?: { commodities?: OilPriceApiCommodity[] };
  error?: string;
  error_code?: string;
  message?: string;
}

interface PriceEntry {
  code?: string;
  price?: number;
  currency?: string;
  created_at?: string;
}

interface PriceResponse {
  status?: string;
  data?: PriceEntry & { prices?: PriceEntry[] };
  error?: string;
  error_code?: string;
  message?: string;
}

let cachedCodes: Record<string, string> = {};
let codesResolvedAt = 0;

function authHeaders(): Record<string, string> {
  return { Authorization: `Token ${process.env.OILPRICEAPI_KEY}` };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: authHeaders() });
  const data = (await res.json()) as T & { error?: string; error_code?: string; message?: string };
  if (!res.ok || data.error) {
    throw new Error(`OilPriceAPI ${res.status} ${data.error_code ?? ''}: ${data.message ?? data.error ?? 'unknown error'}`);
  }
  return data;
}

async function resolveCommodityCodes(): Promise<Record<string, string>> {
  if (Date.now() - codesResolvedAt < CODE_REFRESH_MS && Object.keys(cachedCodes).length > 0) return cachedCodes;

  const data = await fetchJson<CommoditiesResponse>(`${BASE_URL}/commodities`);
  const catalog = data.data?.commodities ?? [];

  const resolved: Record<string, string> = {};
  for (const [commodityId, patterns] of Object.entries(OILPRICEAPI_MATCH)) {
    const match = catalog.find((c) => patterns.some((p) => p.test(c.name) || p.test(c.code)));
    if (match) {
      resolved[commodityId] = match.code;
    } else {
      console.warn(`[oilpriceapi] no catalog match for ${commodityId} — it will stay without a live price source`);
    }
  }

  cachedCodes = resolved;
  codesResolvedAt = Date.now();
  return resolved;
}

/** Batch-fetches current prices for every resolved commodity in a single request. */
export async function fetchOilPriceApiPrices(): Promise<Record<string, number>> {
  if (!process.env.OILPRICEAPI_KEY) return {};

  const codes = await resolveCommodityCodes();
  const entries = Object.entries(codes);
  if (entries.length === 0) return {};

  const byCode = new Map(entries.map(([commodityId, code]) => [code, commodityId]));
  const data = await fetchJson<PriceResponse>(`${BASE_URL}/prices/latest?by_code=${entries.map(([, code]) => code).join(',')}`);

  // Single-code requests return the price fields directly under `data`; multi-code
  // requests return them under `data.prices[]` — handle both shapes.
  const rows: PriceEntry[] = data.data?.prices ?? (data.data ? [data.data] : []);

  const prices: Record<string, number> = {};
  for (const row of rows) {
    if (!row.code || typeof row.price !== 'number') continue;
    if (row.currency && row.currency !== 'USD') {
      console.warn(`[oilpriceapi] skipping ${row.code} — quoted in ${row.currency}, no USD conversion configured`);
      continue;
    }
    const commodityId = byCode.get(row.code);
    if (commodityId) prices[commodityId] = row.price;
  }
  return prices;
}

export function startOilPriceApiPolling(onPrices: (prices: Record<string, number>) => void): void {
  if (!process.env.OILPRICEAPI_KEY) {
    console.log('[oilpriceapi] OILPRICEAPI_KEY not set — Dubai crude, HSFO, VLSFO, and LNG Asia will have no price source.');
    return;
  }

  const poll = () =>
    fetchOilPriceApiPrices()
      .then((prices) => {
        if (Object.keys(prices).length > 0) onPrices(prices);
      })
      .catch((err) => console.error('[oilpriceapi] poll failed:', err instanceof Error ? err.message : err));

  poll();
  // Deliberately NOT scaled by clock.speed — this hits a real, tightly rate-limited
  // (200 req/month free tier) API, so fast-forwarding the demo must not multiply request volume.
  setInterval(poll, POLL_MS);
}
