import type { Commodity, Counterparty, Desk } from './types.js';

export const DESKS: Desk[] = [
  { id: 'crude', name: 'Crude' },
  { id: 'fuel-oil', name: 'Fuel Oil' },
  { id: 'metals', name: 'Metals' },
  { id: 'lng', name: 'LNG' },
];

export const COMMODITIES: Commodity[] = [
  { id: 'BRENT', name: 'Brent Crude', deskId: 'crude', unit: 'bbl', basePrice: 82.4, currency: 'USD' },
  { id: 'WTI', name: 'WTI Crude', deskId: 'crude', unit: 'bbl', basePrice: 78.1, currency: 'USD' },
  { id: 'DUBAI', name: 'Dubai Crude', deskId: 'crude', unit: 'bbl', basePrice: 80.9, currency: 'USD' },
  { id: 'HSFO', name: 'High Sulphur Fuel Oil', deskId: 'fuel-oil', unit: 'mt', basePrice: 512, currency: 'USD' },
  { id: 'VLSFO', name: 'Very Low Sulphur Fuel Oil', deskId: 'fuel-oil', unit: 'mt', basePrice: 611, currency: 'USD' },
  { id: 'COPPER', name: 'Copper', deskId: 'metals', unit: 'mt', basePrice: 9350, currency: 'USD' },
  { id: 'ALUMINIUM', name: 'Aluminium', deskId: 'metals', unit: 'mt', basePrice: 2410, currency: 'USD' },
  { id: 'ZINC', name: 'Zinc', deskId: 'metals', unit: 'mt', basePrice: 2870, currency: 'USD' },
  { id: 'LNG-ASIA', name: 'LNG Asia (JKM)', deskId: 'lng', unit: 'MMBtu', basePrice: 11.6, currency: 'USD' },
  { id: 'LNG-EU', name: 'LNG Europe (TTF)', deskId: 'lng', unit: 'MMBtu', basePrice: 10.2, currency: 'USD' },
];

export const COUNTERPARTIES: Counterparty[] = [
  { id: 'cp-sinopec', name: 'Sinopec', tier: 'A', region: 'APAC' },
  { id: 'cp-pemex', name: 'Pemex', tier: 'B', region: 'LATAM' },
  { id: 'cp-totalenergies', name: 'TotalEnergies', tier: 'A', region: 'EMEA' },
  { id: 'cp-reliance', name: 'Reliance Industries', tier: 'A', region: 'APAC' },
  { id: 'cp-petrobras', name: 'Petrobras', tier: 'B', region: 'LATAM' },
  { id: 'cp-shell', name: 'Shell Trading', tier: 'A', region: 'EMEA' },
  { id: 'cp-glencore', name: 'Glencore', tier: 'A', region: 'EMEA' },
  { id: 'cp-adnoc', name: 'ADNOC', tier: 'A', region: 'MENA' },
  { id: 'cp-cnooc', name: 'CNOOC', tier: 'B', region: 'APAC' },
  { id: 'cp-freepoint', name: 'Freepoint Commodities', tier: 'C', region: 'AMER' },
];

export function commoditiesForDesk(deskId: string): Commodity[] {
  return COMMODITIES.filter((c) => c.deskId === deskId);
}
