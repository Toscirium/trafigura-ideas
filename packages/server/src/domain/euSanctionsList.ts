import type { SanctionsListType } from 'shared';
import type { WatchlistEntry } from './ofacWatchlist.js';

/**
 * The EU's official Financial Sanctions Files (FSF) full-list export — free, public,
 * no auth. This specific token-suffixed URL is the EU Commission's long-standing stable
 * public endpoint for the "GLOBAL" XML snapshot (not a secret — the token is a fixed
 * public constant baked into the URL, not a per-user credential).
 */
const EU_FSF_URL = 'https://webgate.ec.europa.eu/europeaid/fsd/fsf/public/files/xmlFullSanctionsList/content?token=dG9rZW4tMjAxNw';

const REFRESH_MS = 24 * 60 * 60 * 1000;
const LIST_TYPE: SanctionsListType = 'EU-Consolidated';

let entries: WatchlistEntry[] = [];
let lastLoadedAt = 0;

function parseAttrs(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const pattern = /(\w+)="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(attrString)) !== null) {
    attrs[match[1]!] = match[2]!;
  }
  return attrs;
}

/** Each <sanctionEntity> has one or more <nameAlias .../> opening tags carrying the name
 *  as a `wholeName` attribute — no need to parse entity boundaries, every "strong" alias
 *  is itself a legitimate designated name (primary or alias) worth screening against. */
function parseEuFsfXml(xml: string): WatchlistEntry[] {
  const result: WatchlistEntry[] = [];
  const aliasPattern = /<nameAlias\s+([^>]*)>/g;
  let match: RegExpExecArray | null;
  while ((match = aliasPattern.exec(xml)) !== null) {
    const attrs = parseAttrs(match[1]!);
    if (attrs.strong === 'true' && attrs.wholeName) {
      result.push({ name: attrs.wholeName, list: LIST_TYPE });
    }
  }
  return result;
}

export async function refreshEuSanctionsList(): Promise<void> {
  const res = await fetch(EU_FSF_URL);
  if (!res.ok) throw new Error(`EU FSF fetch failed: ${res.status}`);
  const xml = await res.text();
  const parsed = parseEuFsfXml(xml);
  if (parsed.length < 1000) throw new Error(`EU FSF parse produced only ${parsed.length} entries — refusing to use`);
  entries = parsed;
  lastLoadedAt = Date.now();
  console.log(`[compliance] loaded ${entries.length} real EU Consolidated entries`);
}

export function startEuSanctionsSync(): void {
  refreshEuSanctionsList().catch((err) => {
    console.error('[compliance] initial EU FSF load failed, using fictional watchlist until it succeeds:', err instanceof Error ? err.message : err);
  });

  // Deliberately NOT scaled by clock.speed — real network fetch of an external dataset.
  setInterval(() => {
    refreshEuSanctionsList().catch((err) => console.error('[compliance] EU FSF refresh failed:', err instanceof Error ? err.message : err));
  }, REFRESH_MS);
}

export function euSanctionsEntries(): WatchlistEntry[] {
  return entries;
}
