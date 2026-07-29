import type { BreakField, ConfirmationStatus, Trade, TradeConfirmation } from 'shared';

const AWAITING_GRACE_MS = 8000;

/** Trades with no confirmation referencing them yet, old enough that one plausibly should have arrived. */
export function awaitingConfirmationTrades(
  trades: Trade[],
  confirmations: TradeConfirmation[],
  nowMs: number,
): Trade[] {
  const matchedIds = new Set(
    confirmations.map((c) => c.matchedTradeId).filter((id): id is string => id !== null),
  );
  return trades
    .filter((t) => !matchedIds.has(t.id) && nowMs - Date.parse(t.timestamp) > AWAITING_GRACE_MS)
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
}

export const BREAK_FIELD_LABEL: Record<BreakField, string> = {
  price: 'Price',
  volume: 'Volume',
  counterparty: 'Counterparty',
  tradeDate: 'Trade date',
};

export const STATUS_LABEL: Record<ConfirmationStatus, string> = {
  matched: 'Matched',
  break: 'Break',
  unmatched: 'Unmatched',
};

export function sortByReceivedDesc(confirmations: TradeConfirmation[]): TradeConfirmation[] {
  return [...confirmations].sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt));
}
