import type { Voyage } from 'shared';
import { db } from './db.js';
import { computeVoyageFields } from '../domain/voyageCalc.js';

/** Columns persisted directly; everything else on Voyage is server-computed. */
type StoredVoyage = Omit<
  Voyage,
  'laytimeUsedHours' | 'demurrageUsd' | 'dispatchUsd' | 'freightRevenueUsd' | 'voyagePnlUsd' | 'laycanBreach'
>;

const COLUMNS: (keyof StoredVoyage)[] = [
  'id', 'vesselId', 'deskId', 'commodityId', 'counterpartyId', 'loadPortId', 'dischargePortId', 'transitDays',
  'laycanStart', 'laycanEnd', 'plannedLoadStart', 'plannedLoadEnd', 'plannedDischargeStart', 'plannedDischargeEnd',
  'cargoVolume', 'cargoUnit', 'freightRateBasis', 'freightRateUsd', 'demurrageRateUsdPerDay',
  'dispatchRateUsdPerDay', 'laytimeAllowedHours', 'bunkerCostUsd', 'portCostsUsd', 'otherCostsUsd', 'status',
  'updatedAt',
];

function hydrate(row: StoredVoyage): Voyage {
  return { ...row, ...computeVoyageFields(row) };
}

export function listVoyages(): Voyage[] {
  const rows = db.prepare('SELECT * FROM voyages').all() as StoredVoyage[];
  return rows.map(hydrate);
}

export function getVoyage(id: string): Voyage | undefined {
  const row = db.prepare('SELECT * FROM voyages WHERE id = ?').get(id) as StoredVoyage | undefined;
  return row ? hydrate(row) : undefined;
}

export function insertVoyage(voyage: StoredVoyage): Voyage {
  const placeholders = COLUMNS.map((c) => `@${c}`).join(', ');
  db.prepare(`INSERT INTO voyages (${COLUMNS.join(', ')}) VALUES (${placeholders})`).run(voyage);
  return hydrate(voyage);
}

export function updateVoyage(id: string, patch: Partial<StoredVoyage>): Voyage | undefined {
  const existing = db.prepare('SELECT * FROM voyages WHERE id = ?').get(id) as StoredVoyage | undefined;
  if (!existing) return undefined;

  const merged: StoredVoyage = { ...existing, ...patch, id, updatedAt: new Date().toISOString() };
  const assignments = COLUMNS.filter((c) => c !== 'id')
    .map((c) => `${c} = @${c}`)
    .join(', ');
  db.prepare(`UPDATE voyages SET ${assignments} WHERE id = @id`).run(merged);
  return hydrate(merged);
}

export function countVoyages(): number {
  const row = db.prepare('SELECT COUNT(*) as n FROM voyages').get() as { n: number };
  return row.n;
}
