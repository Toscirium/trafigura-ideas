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

/** Fictional decoy entities used to simulate sanctions/PEP screening hits — not real listed parties. */
export const SANCTIONS_WATCHLIST: { name: string; list: SanctionsListType }[] = [
  { name: 'Vostok Trading FZE', list: 'OFAC-SDN' },
  { name: 'Osprey Maritime Corp', list: 'EU-Consolidated' },
  { name: 'A. Rurikov', list: 'PEP' },
  { name: 'Solaris Commodities DMCC', list: 'UN-Consolidated' },
  { name: 'Kestrel Maritime Ltd', list: 'Adverse-Media' },
];
