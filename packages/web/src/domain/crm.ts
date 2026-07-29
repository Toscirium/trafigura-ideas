import type { KycStatus, Position } from 'shared';

/** Mirrors the server's credit-check logic: only in-the-money positions count as exposure at risk. */
export function counterpartyExposureUsd(counterpartyId: string, positions: Position[]): number {
  return positions
    .filter((p) => p.counterpartyId === counterpartyId && p.mtmPnl > 0)
    .reduce((sum, p) => sum + p.mtmPnl, 0);
}

export function utilizationPct(exposureUsd: number, limitUsd: number): number {
  if (limitUsd <= 0) return 0;
  return exposureUsd / limitUsd;
}

export const KYC_LABEL: Record<KycStatus, string> = {
  verified: 'Verified',
  pending: 'Pending',
  expired: 'Expired',
};
