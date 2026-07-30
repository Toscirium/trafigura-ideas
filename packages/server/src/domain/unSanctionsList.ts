import type { SanctionsListType } from 'shared';
import type { WatchlistEntry } from './ofacWatchlist.js';

/** The UN Security Council's official Consolidated List XML export — free, public, no auth. */
const UN_CONSOLIDATED_URL = 'https://scsanctions.un.org/resources/xml/en/consolidated.xml';

const REFRESH_MS = 24 * 60 * 60 * 1000;
const LIST_TYPE: SanctionsListType = 'UN-Consolidated';

let entries: WatchlistEntry[] = [];
let lastLoadedAt = 0;

function extractField(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  return match ? match[1]!.trim() : '';
}

/** INDIVIDUALs split their name across up to 4 fields; ENTITYs (companies, vessels,
 *  groups) put the whole name in FIRST_NAME alone. */
function parseUnConsolidatedXml(xml: string): WatchlistEntry[] {
  const result: WatchlistEntry[] = [];

  for (const [, block] of xml.matchAll(/<INDIVIDUAL>([\s\S]*?)<\/INDIVIDUAL>/g)) {
    const name = ['FIRST_NAME', 'SECOND_NAME', 'THIRD_NAME', 'FOURTH_NAME']
      .map((tag) => extractField(block, tag))
      .filter(Boolean)
      .join(' ');
    if (name) result.push({ name, list: LIST_TYPE });
  }

  for (const [, block] of xml.matchAll(/<ENTITY>([\s\S]*?)<\/ENTITY>/g)) {
    const name = extractField(block, 'FIRST_NAME');
    if (name) result.push({ name, list: LIST_TYPE });
  }

  return result;
}

export async function refreshUnSanctionsList(): Promise<void> {
  const res = await fetch(UN_CONSOLIDATED_URL);
  if (!res.ok) throw new Error(`UN Consolidated List fetch failed: ${res.status}`);
  const xml = await res.text();
  const parsed = parseUnConsolidatedXml(xml);
  if (parsed.length < 500) throw new Error(`UN Consolidated List parse produced only ${parsed.length} entries — refusing to use`);
  entries = parsed;
  lastLoadedAt = Date.now();
  console.log(`[compliance] loaded ${entries.length} real UN Consolidated entries`);
}

export function startUnSanctionsSync(): void {
  refreshUnSanctionsList().catch((err) => {
    console.error('[compliance] initial UN Consolidated List load failed, using fictional watchlist until it succeeds:', err instanceof Error ? err.message : err);
  });

  // Deliberately NOT scaled by clock.speed — real network fetch of an external dataset.
  setInterval(() => {
    refreshUnSanctionsList().catch((err) => console.error('[compliance] UN Consolidated List refresh failed:', err instanceof Error ? err.message : err));
  }, REFRESH_MS);
}

export function unSanctionsEntries(): WatchlistEntry[] {
  return entries;
}
