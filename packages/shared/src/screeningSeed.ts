import type { SanctionsListType } from './types.js';

export const ISSUING_BANKS: string[] = [
  'Standard Chartered',
  'HSBC',
  'BNP Paribas',
  'Citibank',
  'ICBC',
  'DBS Bank',
  'Deutsche Bank',
];

/** Fictional decoy entities — not real listed parties. Used two ways: (1) as input to the
 *  document-intelligence demo simulation, which stays synthetic by design; (2) as the
 *  Adverse-Media entry and the full-list emergency fallback in watchlists.ts if every real
 *  sanctions/PEP feed is simultaneously unreachable. */
export const SANCTIONS_WATCHLIST: { name: string; list: SanctionsListType }[] = [
  { name: 'Vostok Trading FZE', list: 'OFAC-SDN' },
  { name: 'Osprey Maritime Corp', list: 'EU-Consolidated' },
  { name: 'A. Rurikov', list: 'PEP' },
  { name: 'Solaris Commodities DMCC', list: 'UN-Consolidated' },
  { name: 'Kestrel Maritime Ltd', list: 'Adverse-Media' },
];
