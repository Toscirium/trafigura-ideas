import { SANCTIONS_WATCHLIST } from 'shared';
import type { SanctionsListType } from 'shared';

/**
 * The real, free, no-auth-required OFAC Sanctions List Service export — the same data
 * banks and compliance vendors actually screen against. ~19k designated individuals,
 * entities, and vessels. Headerless CSV, 12 fixed columns (ent_num, SDN_Name, SDN_Type,
 * Program, Title, Call_Sign, Vess_type, Tonnage, GRT, Vess_flag, Vess_owner, Remarks) —
 * empty fields are the literal string "-0-", not blank.
 */
const SDN_CSV_URL = 'https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN.CSV';

// OFAC republishes this list roughly daily; a demo doesn't need tighter freshness than that.
const REFRESH_MS = 24 * 60 * 60 * 1000;

export interface WatchlistEntry {
  name: string;
  list: SanctionsListType;
}

let realEntries: WatchlistEntry[] = [];
let lastLoadedAt = 0;

/** The one fictional entry explicitly labeled 'OFAC-SDN' is dropped once we have the real
 *  list (it'd be misleading to keep a made-up entry under a list type we now source for
 *  real); the other list types (EU/UN-Consolidated, PEP, Adverse-Media) stay fictional —
 *  those aren't simple public downloads the way the SDN list is. */
const FICTIONAL_NON_SDN: WatchlistEntry[] = SANCTIONS_WATCHLIST.filter((w) => w.list !== 'OFAC-SDN');

/** Minimal parser for this one fixed, well-known schema — not general-purpose CSV. */
function parseSdnCsv(text: string): WatchlistEntry[] {
  const entries: WatchlistEntry[] = [];
  const fieldPattern = /"([^"]*)"|([^,]+)/g;

  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const fields: string[] = [];
    let match: RegExpExecArray | null;
    fieldPattern.lastIndex = 0;
    while ((match = fieldPattern.exec(line)) !== null) {
      fields.push((match[1] ?? match[2] ?? '').trim());
    }
    const name = fields[1];
    if (name && name !== '-0-') entries.push({ name, list: 'OFAC-SDN' });
  }
  return entries;
}

export async function refreshOfacWatchlist(): Promise<void> {
  const res = await fetch(SDN_CSV_URL);
  if (!res.ok) throw new Error(`OFAC SDN fetch failed: ${res.status}`);
  const text = await res.text();
  const parsed = parseSdnCsv(text);
  // Sanity check we got the real list (~19k rows), not an error page or empty response.
  if (parsed.length < 1000) throw new Error(`OFAC SDN parse produced only ${parsed.length} entries — refusing to use`);
  realEntries = parsed;
  lastLoadedAt = Date.now();
  console.log(`[compliance] loaded ${realEntries.length} real OFAC SDN entries`);
}

export function startOfacWatchlistSync(): void {
  refreshOfacWatchlist().catch((err) => {
    console.error('[compliance] initial OFAC SDN load failed, using fictional watchlist until it succeeds:', err instanceof Error ? err.message : err);
  });

  // Deliberately NOT scaled by clock.speed — this is a real network fetch of an external
  // dataset, not part of the simulation's pacing.
  setInterval(() => {
    refreshOfacWatchlist().catch((err) => console.error('[compliance] OFAC SDN refresh failed:', err instanceof Error ? err.message : err));
  }, REFRESH_MS);
}

export function currentWatchlist(): WatchlistEntry[] {
  return realEntries.length > 0 ? [...realEntries, ...FICTIONAL_NON_SDN] : SANCTIONS_WATCHLIST;
}

export function isUsingRealOfacData(): boolean {
  return realEntries.length > 0 && Date.now() - lastLoadedAt < REFRESH_MS * 2;
}
