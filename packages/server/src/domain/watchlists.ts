import { SANCTIONS_WATCHLIST } from 'shared';
import { ofacEntries, startOfacWatchlistSync, type WatchlistEntry } from './ofacWatchlist.js';
import { euSanctionsEntries, startEuSanctionsSync } from './euSanctionsList.js';
import { unSanctionsEntries, startUnSanctionsSync } from './unSanctionsList.js';

export type { WatchlistEntry } from './ofacWatchlist.js';

/** OFAC-SDN, EU-Consolidated, and UN-Consolidated are all sourced for real now (each is a
 *  free public government/international-body dataset). PEP and Adverse-Media stay
 *  fictional — neither has a simple single-file public download the way the sanctions
 *  lists do (PEP status is typically a commercial aggregation product; adverse media is
 *  inherently news-screening output, not a static list). */
const FICTIONAL_REMAINING: WatchlistEntry[] = SANCTIONS_WATCHLIST.filter((w) => w.list === 'PEP' || w.list === 'Adverse-Media');

export function startWatchlistSync(): void {
  startOfacWatchlistSync();
  startEuSanctionsSync();
  startUnSanctionsSync();
}

export function currentWatchlist(): WatchlistEntry[] {
  const real = [...ofacEntries(), ...euSanctionsEntries(), ...unSanctionsEntries()];
  return real.length > 0 ? [...real, ...FICTIONAL_REMAINING] : SANCTIONS_WATCHLIST;
}
