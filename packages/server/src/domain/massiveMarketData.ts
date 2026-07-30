const BASE_URL = 'https://api.massive.com';

interface MassiveProductConfig {
  productCode: string;
  /** Massive quotes some contracts in a different unit/currency than ours; convert to our USD/{unit} basis. */
  convert: (rawPrice: number) => number;
}

// EUR/MWh -> USD/MMBtu: the MMBtu-per-MWh factor (HHV basis) is fixed physics, but there's
// no live FX feed wired up here, so the EUR/USD leg is a static approximation, not live.
const MWH_TO_MMBTU = 3.412;
const EUR_USD_APPROX = 1.08;
const LBS_PER_MT = 2204.62;

/**
 * commodityId -> Massive futures product. Resolved by querying the live products endpoint
 * and picking, per commodity, the plain outright contract with the widest real trade/quote
 * coverage (see project memory for the discovery process — several products in our basket,
 * e.g. Dubai crude and JKM LNG, are listed but have no populated market data under this
 * API key's plan and were deliberately left out).
 */
export const MASSIVE_PRODUCT_MAP: Record<string, MassiveProductConfig> = {
  BRENT: { productCode: 'BZ', convert: (p) => p },
  WTI: { productCode: 'CL', convert: (p) => p },
  COPPER: { productCode: 'HG', convert: (p) => p * LBS_PER_MT },
  ALUMINIUM: { productCode: 'ALI', convert: (p) => p },
  ZINC: { productCode: 'ZNC', convert: (p) => p },
  'LNG-EU': { productCode: 'TTF', convert: (p) => (p / MWH_TO_MMBTU) * EUR_USD_APPROX },
};

interface SnapshotResult {
  details: { ticker: string; product_code: string; settlement_date: string };
  last_trade?: { price?: number };
  last_quote?: { bid?: number; ask?: number };
  session?: { close?: number };
}

interface SnapshotResponse {
  status: string;
  results?: SnapshotResult[];
  next_url?: string;
  error?: string;
}

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${process.env.MASSIVE_API_KEY}` };
}

async function fetchSnapshotPage(url: string): Promise<SnapshotResponse> {
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Massive API ${res.status}: ${await res.text()}`);
  return (await res.json()) as SnapshotResponse;
}

function extractPrice(r: SnapshotResult): number | null {
  if (typeof r.last_trade?.price === 'number') return r.last_trade.price;
  if (typeof r.last_quote?.bid === 'number' && typeof r.last_quote?.ask === 'number') {
    return (r.last_quote.bid + r.last_quote.ask) / 2;
  }
  if (typeof r.session?.close === 'number') return r.session.close;
  return null;
}

/** Plain outright contract tickers look like "BZF7" (product code + month letter + year
 *  digit) — Massive also returns calendar spreads/butterflies ("CL:BF F7-G7-H7") under the
 *  same product_code, which this filters out. */
function isOutrightTicker(productCode: string, ticker: string): boolean {
  return new RegExp(`^${productCode}[A-Z][0-9]{1,2}$`).test(ticker);
}

async function resolveFrontMonthTicker(productCode: string): Promise<string | null> {
  const today = new Date().toISOString().slice(0, 10);
  let url = `${BASE_URL}/futures/v1/snapshot?product_code=${productCode}&limit=250`;
  const candidates: SnapshotResult[] = [];

  for (let page = 0; page < 10 && url && candidates.length < 3; page++) {
    const data = await fetchSnapshotPage(url);
    if (data.status !== 'OK') throw new Error(`Massive API error: ${data.error ?? 'unknown'}`);
    for (const r of data.results ?? []) {
      if (isOutrightTicker(productCode, r.details.ticker) && extractPrice(r) !== null) {
        candidates.push(r);
      }
    }
    url = data.next_url ?? '';
  }

  if (candidates.length === 0) return null;
  const future = candidates.filter((r) => r.details.settlement_date >= today);
  const pool = future.length > 0 ? future : candidates;
  pool.sort((a, b) => a.details.settlement_date.localeCompare(b.details.settlement_date));
  return pool[0]!.details.ticker;
}

/** commodityId -> resolved front-month ticker, e.g. { BRENT: 'BZF7' }. */
export async function resolveFrontMonthTickers(): Promise<Record<string, string>> {
  const resolved: Record<string, string> = {};
  for (const [commodityId, cfg] of Object.entries(MASSIVE_PRODUCT_MAP)) {
    try {
      const ticker = await resolveFrontMonthTicker(cfg.productCode);
      if (ticker) resolved[commodityId] = ticker;
    } catch (err) {
      console.error(`[market-data] failed to resolve front month for ${commodityId}:`, err instanceof Error ? err.message : err);
    }
  }
  return resolved;
}

/** Batch-fetches current prices for the given resolved tickers in a single request. */
export async function fetchPricesForTickers(tickersByCommodity: Record<string, string>): Promise<Record<string, number>> {
  const entries = Object.entries(tickersByCommodity);
  if (entries.length === 0) return {};

  const tickers = entries.map(([, ticker]) => ticker);
  const url = `${BASE_URL}/futures/v1/snapshot?ticker.any_of=${tickers.join(',')}&limit=${tickers.length}`;
  const data = await fetchSnapshotPage(url);
  if (data.status !== 'OK') throw new Error(`Massive API error: ${data.error ?? 'unknown'}`);

  const byTicker = new Map((data.results ?? []).map((r) => [r.details.ticker, r]));
  const prices: Record<string, number> = {};
  for (const [commodityId, ticker] of entries) {
    const raw = byTicker.has(ticker) ? extractPrice(byTicker.get(ticker)!) : null;
    if (raw !== null) prices[commodityId] = MASSIVE_PRODUCT_MAP[commodityId]!.convert(raw);
  }
  return prices;
}
