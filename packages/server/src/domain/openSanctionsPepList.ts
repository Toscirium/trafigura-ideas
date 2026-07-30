import type { SanctionsListType } from 'shared';
import type { WatchlistEntry } from './ofacWatchlist.js';

/**
 * OpenSanctions' free, public, no-auth "peps" dataset — a names-only export, updated
 * daily, always pointing at the latest snapshot (no version pinning needed). Free for
 * non-commercial use under OpenSanctions' CC BY-NC 4.0 license.
 */
const PEP_NAMES_URL = 'https://data.opensanctions.org/datasets/latest/peps/names.txt';

const REFRESH_MS = 24 * 60 * 60 * 1000;
const LIST_TYPE: SanctionsListType = 'PEP';

let entries: WatchlistEntry[] = [];
let lastLoadedAt = 0;

function parseNamesTxt(text: string): WatchlistEntry[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((name) => ({ name, list: LIST_TYPE }));
}

export async function refreshOpenSanctionsPepList(): Promise<void> {
  const res = await fetch(PEP_NAMES_URL);
  if (!res.ok) throw new Error(`OpenSanctions PEP list fetch failed: ${res.status}`);
  const text = await res.text();
  const parsed = parseNamesTxt(text);
  // Sanity check we got the real list (hundreds of thousands of names), not an error page.
  if (parsed.length < 10_000) throw new Error(`OpenSanctions PEP list parse produced only ${parsed.length} entries — refusing to use`);
  entries = parsed;
  lastLoadedAt = Date.now();
  console.log(`[compliance] loaded ${entries.length} real OpenSanctions PEP entries`);
}

export function startPepListSync(): void {
  refreshOpenSanctionsPepList().catch((err) => {
    console.error('[compliance] initial OpenSanctions PEP load failed, using fictional watchlist until it succeeds:', err instanceof Error ? err.message : err);
  });

  // Deliberately NOT scaled by clock.speed — real network fetch of an external dataset.
  setInterval(() => {
    refreshOpenSanctionsPepList().catch((err) => console.error('[compliance] OpenSanctions PEP refresh failed:', err instanceof Error ? err.message : err));
  }, REFRESH_MS);
}

export function pepEntries(): WatchlistEntry[] {
  return entries;
}
