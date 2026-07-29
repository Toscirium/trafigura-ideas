import type { Voyage } from 'shared';

const HOURS_PER_DAY = 24;

export type ComputedVoyageFields = Pick<
  Voyage,
  'laytimeUsedHours' | 'demurrageUsd' | 'dispatchUsd' | 'freightRevenueUsd' | 'voyagePnlUsd' | 'laycanBreach'
>;

/**
 * Voyage timing is two port calls (load, discharge). Laytime allowed is a single
 * charter-party allowance covering both calls; time used beyond it is demurrage
 * (owed to the owner), time saved is dispatch (owed back to the charterer, usually
 * at half the demurrage rate in real charters — callers pass the agreed rate directly).
 */
export function computeVoyageFields(
  voyage: Pick<
    Voyage,
    | 'plannedLoadStart'
    | 'plannedLoadEnd'
    | 'plannedDischargeStart'
    | 'plannedDischargeEnd'
    | 'laycanStart'
    | 'laycanEnd'
    | 'laytimeAllowedHours'
    | 'demurrageRateUsdPerDay'
    | 'dispatchRateUsdPerDay'
    | 'freightRateBasis'
    | 'freightRateUsd'
    | 'cargoVolume'
    | 'bunkerCostUsd'
    | 'portCostsUsd'
    | 'otherCostsUsd'
  >,
): ComputedVoyageFields {
  const loadHours = hoursBetween(voyage.plannedLoadStart, voyage.plannedLoadEnd);
  const dischargeHours = hoursBetween(voyage.plannedDischargeStart, voyage.plannedDischargeEnd);
  const laytimeUsedHours = loadHours + dischargeHours;

  const diffHours = laytimeUsedHours - voyage.laytimeAllowedHours;
  const demurrageUsd = diffHours > 0 ? (diffHours / HOURS_PER_DAY) * voyage.demurrageRateUsdPerDay : 0;
  const dispatchUsd = diffHours < 0 ? (-diffHours / HOURS_PER_DAY) * voyage.dispatchRateUsdPerDay : 0;

  const freightRevenueUsd =
    voyage.freightRateBasis === 'lumpsum' ? voyage.freightRateUsd : voyage.freightRateUsd * voyage.cargoVolume;

  const voyageCostsUsd = voyage.bunkerCostUsd + voyage.portCostsUsd + voyage.otherCostsUsd;
  const voyagePnlUsd = freightRevenueUsd + demurrageUsd - dispatchUsd - voyageCostsUsd;

  const loadStartMs = Date.parse(voyage.plannedLoadStart);
  const laycanBreach = loadStartMs < Date.parse(voyage.laycanStart) || loadStartMs > Date.parse(voyage.laycanEnd);

  return { laytimeUsedHours, demurrageUsd, dispatchUsd, freightRevenueUsd, voyagePnlUsd, laycanBreach };
}

function hoursBetween(startIso: string, endIso: string): number {
  return Math.max(0, (Date.parse(endIso) - Date.parse(startIso)) / (1000 * 60 * 60));
}
