import type { CreditCheckResult } from 'shared';
import { store } from '../state/store.js';
import { crmStore } from '../state/crmStore.js';

export function currentExposureUsd(counterpartyId: string): number {
  let sum = 0;
  for (const position of store.positions.values()) {
    // Only in-the-money positions represent real counterparty credit risk to us.
    if (position.counterpartyId === counterpartyId && position.mtmPnl > 0) {
      sum += position.mtmPnl;
    }
  }
  return sum;
}

/**
 * Conservatively treats the new trade's full gross notional as additional exposure
 * (we don't know yet whether the market will move in our favor), and compares the
 * projected total against the counterparty's live credit limit.
 */
export function checkCreditLimit(input: { counterpartyId: string; volume: number; price: number }): CreditCheckResult {
  const profile = crmStore.getProfile(input.counterpartyId);
  const limitUsd = profile?.creditLimitUsd ?? Number.POSITIVE_INFINITY;
  const exposureUsd = currentExposureUsd(input.counterpartyId);
  const projectedExposureUsd = exposureUsd + input.volume * input.price;
  const utilizationPct = Number.isFinite(limitUsd) ? projectedExposureUsd / limitUsd : 0;

  return {
    ok: projectedExposureUsd <= limitUsd,
    limitUsd,
    currentExposureUsd: exposureUsd,
    projectedExposureUsd,
    utilizationPct,
  };
}
