import type { DeskId, FreightRateBasis, Port, Vessel, VesselType } from './types.js';

export const PORTS: Port[] = [
  { id: 'port-ras-tanura', name: 'Ras Tanura', unlocode: 'SARTA', country: 'Saudi Arabia', region: 'MENA' },
  { id: 'port-fujairah', name: 'Fujairah', unlocode: 'AEFJR', country: 'UAE', region: 'MENA' },
  { id: 'port-rotterdam', name: 'Rotterdam', unlocode: 'NLRTM', country: 'Netherlands', region: 'EMEA' },
  { id: 'port-singapore', name: 'Singapore', unlocode: 'SGSIN', country: 'Singapore', region: 'APAC' },
  { id: 'port-ningbo', name: 'Ningbo', unlocode: 'CNNBO', country: 'China', region: 'APAC' },
  { id: 'port-houston', name: 'Houston', unlocode: 'USHOU', country: 'USA', region: 'AMER' },
  { id: 'port-santos', name: 'Santos', unlocode: 'BRSSZ', country: 'Brazil', region: 'LATAM' },
  { id: 'port-freeport-bhs', name: 'Freeport LNG', unlocode: 'USFRP', country: 'USA', region: 'AMER' },
  { id: 'port-sodegaura', name: 'Sodegaura', unlocode: 'JPSOD', country: 'Japan', region: 'APAC' },
  { id: 'port-antwerp', name: 'Antwerp', unlocode: 'BEANR', country: 'Belgium', region: 'EMEA' },
];

export const VESSELS: Vessel[] = [
  { id: 'v-horizon-star', name: 'Horizon Star', imo: '9812345', type: 'VLCC', capacity: 2_000_000, capacityUnit: 'bbl', speedKnots: 15, ownership: 'chartered-in' },
  { id: 'v-atlas-voyager', name: 'Atlas Voyager', imo: '9812346', type: 'Suezmax', capacity: 1_000_000, capacityUnit: 'bbl', speedKnots: 15.5, ownership: 'owned' },
  { id: 'v-cape-endeavour', name: 'Cape Endeavour', imo: '9812347', type: 'Aframax', capacity: 700_000, capacityUnit: 'bbl', speedKnots: 14.5, ownership: 'chartered-in' },
  { id: 'v-meridian-glory', name: 'Meridian Glory', imo: '9812348', type: 'Panamax', capacity: 60_000, capacityUnit: 'mt', speedKnots: 14, ownership: 'owned' },
  { id: 'v-nordic-pride', name: 'Nordic Pride', imo: '9812349', type: 'MR', capacity: 45_000, capacityUnit: 'mt', speedKnots: 14.5, ownership: 'chartered-in' },
  { id: 'v-pacific-crown', name: 'Pacific Crown', imo: '9812350', type: 'LNGC', capacity: 170_000, capacityUnit: 'cbm', speedKnots: 19.5, ownership: 'owned' },
  { id: 'v-southern-cross', name: 'Southern Cross', imo: '9812351', type: 'Aframax', capacity: 750_000, capacityUnit: 'bbl', speedKnots: 14.5, ownership: 'chartered-in' },
  { id: 'v-orion-trader', name: 'Orion Trader', imo: '9812352', type: 'MR', capacity: 50_000, capacityUnit: 'mt', speedKnots: 14, ownership: 'owned' },
];

export function vesselTypeDeskId(type: VesselType): DeskId {
  if (type === 'LNGC') return 'lng';
  return 'crude';
}

export interface VoyageSeedRow {
  vesselId: string;
  deskId: DeskId;
  commodityId: string;
  counterpartyId: string;
  loadPortId: string;
  dischargePortId: string;
  transitDays: number;
  laycanOffsetDays: number;
  loadDurationDays: number;
  cargoVolume: number;
  cargoUnit: 'bbl' | 'mt' | 'cbm';
  freightRateBasis: FreightRateBasis;
  freightRateUsd: number;
  demurrageRateUsdPerDay: number;
  dispatchRateUsdPerDay: number;
  laytimeAllowedHours: number;
  bunkerCostUsd: number;
  portCostsUsd: number;
  otherCostsUsd: number;
}

/** Seed voyages, timed relative to server start so the board always looks "live". */
export const VOYAGE_SEEDS: VoyageSeedRow[] = [
  {
    vesselId: 'v-horizon-star', deskId: 'crude', commodityId: 'DUBAI', counterpartyId: 'cp-sinopec',
    loadPortId: 'port-ras-tanura', dischargePortId: 'port-ningbo', transitDays: 16,
    laycanOffsetDays: -2, loadDurationDays: 2, cargoVolume: 2_000_000, cargoUnit: 'bbl',
    freightRateBasis: 'lumpsum', freightRateUsd: 4_200_000,
    demurrageRateUsdPerDay: 65_000, dispatchRateUsdPerDay: 32_500, laytimeAllowedHours: 96,
    bunkerCostUsd: 950_000, portCostsUsd: 180_000, otherCostsUsd: 60_000,
  },
  {
    vesselId: 'v-atlas-voyager', deskId: 'crude', commodityId: 'BRENT', counterpartyId: 'cp-totalenergies',
    loadPortId: 'port-fujairah', dischargePortId: 'port-rotterdam', transitDays: 12,
    laycanOffsetDays: 1, loadDurationDays: 1.5, cargoVolume: 1_000_000, cargoUnit: 'bbl',
    freightRateBasis: 'lumpsum', freightRateUsd: 2_600_000,
    demurrageRateUsdPerDay: 48_000, dispatchRateUsdPerDay: 24_000, laytimeAllowedHours: 72,
    bunkerCostUsd: 620_000, portCostsUsd: 140_000, otherCostsUsd: 45_000,
  },
  {
    vesselId: 'v-cape-endeavour', deskId: 'crude', commodityId: 'WTI', counterpartyId: 'cp-shell',
    loadPortId: 'port-houston', dischargePortId: 'port-antwerp', transitDays: 9,
    laycanOffsetDays: 3, loadDurationDays: 1.5, cargoVolume: 700_000, cargoUnit: 'bbl',
    freightRateBasis: 'lumpsum', freightRateUsd: 1_950_000,
    demurrageRateUsdPerDay: 42_000, dispatchRateUsdPerDay: 21_000, laytimeAllowedHours: 60,
    bunkerCostUsd: 410_000, portCostsUsd: 110_000, otherCostsUsd: 35_000,
  },
  {
    vesselId: 'v-meridian-glory', deskId: 'fuel-oil', commodityId: 'VLSFO', counterpartyId: 'cp-glencore',
    loadPortId: 'port-singapore', dischargePortId: 'port-santos', transitDays: 22,
    laycanOffsetDays: -5, loadDurationDays: 1, cargoVolume: 60_000, cargoUnit: 'mt',
    freightRateBasis: 'per-unit', freightRateUsd: 58,
    demurrageRateUsdPerDay: 22_000, dispatchRateUsdPerDay: 11_000, laytimeAllowedHours: 48,
    bunkerCostUsd: 780_000, portCostsUsd: 95_000, otherCostsUsd: 30_000,
  },
  {
    vesselId: 'v-nordic-pride', deskId: 'fuel-oil', commodityId: 'HSFO', counterpartyId: 'cp-petrobras',
    loadPortId: 'port-rotterdam', dischargePortId: 'port-santos', transitDays: 14,
    laycanOffsetDays: 4, loadDurationDays: 1, cargoVolume: 45_000, cargoUnit: 'mt',
    freightRateBasis: 'per-unit', freightRateUsd: 41,
    demurrageRateUsdPerDay: 19_000, dispatchRateUsdPerDay: 9_500, laytimeAllowedHours: 48,
    bunkerCostUsd: 460_000, portCostsUsd: 80_000, otherCostsUsd: 25_000,
  },
  {
    vesselId: 'v-pacific-crown', deskId: 'lng', commodityId: 'LNG-ASIA', counterpartyId: 'cp-cnooc',
    loadPortId: 'port-freeport-bhs', dischargePortId: 'port-sodegaura', transitDays: 20,
    laycanOffsetDays: -1, loadDurationDays: 1.5, cargoVolume: 170_000, cargoUnit: 'cbm',
    freightRateBasis: 'lumpsum', freightRateUsd: 5_800_000,
    demurrageRateUsdPerDay: 90_000, dispatchRateUsdPerDay: 45_000, laytimeAllowedHours: 60,
    bunkerCostUsd: 1_100_000, portCostsUsd: 220_000, otherCostsUsd: 75_000,
  },
  {
    vesselId: 'v-southern-cross', deskId: 'crude', commodityId: 'DUBAI', counterpartyId: 'cp-adnoc',
    loadPortId: 'port-fujairah', dischargePortId: 'port-singapore', transitDays: 6,
    laycanOffsetDays: 6, loadDurationDays: 1.5, cargoVolume: 750_000, cargoUnit: 'bbl',
    freightRateBasis: 'lumpsum', freightRateUsd: 1_450_000,
    demurrageRateUsdPerDay: 40_000, dispatchRateUsdPerDay: 20_000, laytimeAllowedHours: 60,
    bunkerCostUsd: 260_000, portCostsUsd: 90_000, otherCostsUsd: 28_000,
  },
  {
    vesselId: 'v-orion-trader', deskId: 'metals', commodityId: 'COPPER', counterpartyId: 'cp-freepoint',
    loadPortId: 'port-santos', dischargePortId: 'port-ningbo', transitDays: 24,
    laycanOffsetDays: -3, loadDurationDays: 2, cargoVolume: 50_000, cargoUnit: 'mt',
    freightRateBasis: 'per-unit', freightRateUsd: 64,
    demurrageRateUsdPerDay: 24_000, dispatchRateUsdPerDay: 12_000, laytimeAllowedHours: 72,
    bunkerCostUsd: 820_000, portCostsUsd: 100_000, otherCostsUsd: 32_000,
  },
];
