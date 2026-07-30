import { SANCTIONS_WATCHLIST } from 'shared';
import { ofacEntries, startOfacWatchlistSync, type WatchlistEntry } from './ofacWatchlist.js';
import { euSanctionsEntries, startEuSanctionsSync } from './euSanctionsList.js';
import { unSanctionsEntries, startUnSanctionsSync } from './unSanctionsList.js';
import { pepEntries, startPepListSync } from './openSanctionsPepList.js';

export type { WatchlistEntry } from './ofacWatchlist.js';

/** OFAC-SDN, EU-Consolidated, UN-Consolidated, and PEP are all sourced for real now (each
 *  is a free public dataset — see ofacWatchlist.ts, euSanctionsList.ts, unSanctionsList.ts,
 *  openSanctionsPepList.ts). Adverse-Media stays fictional — it's inherently live
 *  news-screening output, not a static downloadable list. */
const FICTIONAL_REMAINING: WatchlistEntry[] = SANCTIONS_WATCHLIST.filter((w) => w.list === 'Adverse-Media');

export function startWatchlistSync(): void {
  startOfacWatchlistSync();
  startEuSanctionsSync();
  startUnSanctionsSync();
  startPepListSync();
}

export function currentWatchlist(): WatchlistEntry[] {
  const real = [...ofacEntries(), ...euSanctionsEntries(), ...unSanctionsEntries(), ...pepEntries()];
  return real.length > 0 ? [...real, ...FICTIONAL_REMAINING] : SANCTIONS_WATCHLIST;
}
