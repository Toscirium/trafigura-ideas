import type { BreakDetail, ConfirmationExtracted, ConfirmationStatus, Trade } from 'shared';

const CANDIDATE_WINDOW_MS = 10 * 60 * 1000;
const UNMATCHED_DISTANCE_THRESHOLD = 3;

const PRICE_BREAK_PCT = 0.001;
const PRICE_CRITICAL_PCT = 0.01;
const VOLUME_BREAK_PCT = 0.005;
const VOLUME_CRITICAL_PCT = 0.05;

export interface MatchResult {
  matchedTradeId: string | null;
  breaks: BreakDetail[];
  status: ConfirmationStatus;
}

/**
 * Scores every desk/commodity/side-compatible trade in the candidate window against
 * the confirmation's extracted fields (price/volume proximity, counterparty match,
 * time proximity) and picks the closest one — the same "fuzzy" business-key matching
 * a real middle-office reconciliation tool does, since a confirmation never carries
 * the ETRM's internal trade id. If nothing is close enough, the confirmation is an
 * orphan ("unmatched"). Field-level differences on the chosen match become breaks.
 */
export function matchConfirmation(
  extracted: ConfirmationExtracted,
  candidateTrades: readonly Trade[],
  receivedAtMs: number,
): MatchResult {
  const pool = candidateTrades.filter((t) => {
    if (t.deskId !== extracted.deskId || t.commodityId !== extracted.commodityId || t.side !== extracted.side) {
      return false;
    }
    const ageMs = receivedAtMs - Date.parse(t.timestamp);
    return ageMs >= 0 && ageMs <= CANDIDATE_WINDOW_MS;
  });

  if (pool.length === 0) {
    return { matchedTradeId: null, breaks: [], status: 'unmatched' };
  }

  let best = pool[0]!;
  let bestDistance = distance(extracted, best);
  for (const candidate of pool.slice(1)) {
    const d = distance(extracted, candidate);
    if (d < bestDistance) {
      best = candidate;
      bestDistance = d;
    }
  }

  if (bestDistance > UNMATCHED_DISTANCE_THRESHOLD) {
    return { matchedTradeId: null, breaks: [], status: 'unmatched' };
  }

  const breaks = detectBreaks(extracted, best);
  return { matchedTradeId: best.id, breaks, status: breaks.length === 0 ? 'matched' : 'break' };
}

function distance(extracted: ConfirmationExtracted, trade: Trade): number {
  const priceDiffPct = Math.abs(trade.price - extracted.price) / trade.price;
  const volumeDiffPct = Math.abs(trade.volume - extracted.volume) / trade.volume;
  const counterpartyPenalty = trade.counterpartyId === extracted.counterpartyId ? 0 : 1.5;
  const timeDiffMin = Math.abs(Date.parse(trade.timestamp) - Date.parse(extracted.tradeDate)) / 60_000;
  return priceDiffPct * 4 + volumeDiffPct * 2 + counterpartyPenalty + Math.min(timeDiffMin, 60) * 0.01;
}

function detectBreaks(extracted: ConfirmationExtracted, trade: Trade): BreakDetail[] {
  const breaks: BreakDetail[] = [];

  const priceDiffPct = Math.abs(trade.price - extracted.price) / trade.price;
  if (priceDiffPct > PRICE_BREAK_PCT) {
    breaks.push({
      field: 'price',
      etrmValue: trade.price.toFixed(2),
      confirmedValue: extracted.price.toFixed(2),
      severity: priceDiffPct > PRICE_CRITICAL_PCT ? 'critical' : 'warning',
    });
  }

  const volumeDiffPct = Math.abs(trade.volume - extracted.volume) / trade.volume;
  if (volumeDiffPct > VOLUME_BREAK_PCT) {
    breaks.push({
      field: 'volume',
      etrmValue: trade.volume.toLocaleString(),
      confirmedValue: extracted.volume.toLocaleString(),
      severity: volumeDiffPct > VOLUME_CRITICAL_PCT ? 'critical' : 'warning',
    });
  }

  if (trade.counterpartyId !== extracted.counterpartyId) {
    breaks.push({
      field: 'counterparty',
      etrmValue: trade.counterpartyId,
      confirmedValue: extracted.counterpartyId,
      severity: 'critical',
    });
  }

  const etrmDay = trade.timestamp.slice(0, 10);
  const confirmedDay = extracted.tradeDate.slice(0, 10);
  if (etrmDay !== confirmedDay) {
    breaks.push({ field: 'tradeDate', etrmValue: etrmDay, confirmedValue: confirmedDay, severity: 'warning' });
  }

  return breaks;
}
