import { COMMODITIES } from 'shared';
import type { ConfirmationChannel, ConfirmationExtracted } from 'shared';
import { counterpartyStore } from '../state/counterpartyStore.js';

function lookup(extracted: ConfirmationExtracted) {
  const commodity = COMMODITIES.find((c) => c.id === extracted.commodityId);
  const counterparty = counterpartyStore.list().find((c) => c.id === extracted.counterpartyId);
  return { commodity, counterparty };
}

/** Renders the "raw" inbound message a parser (email/EDI/SWIFT) would have extracted these fields from. */
export function formatRawConfirmation(channel: ConfirmationChannel, extracted: ConfirmationExtracted, ref: string): string {
  const { commodity, counterparty } = lookup(extracted);
  const commodityName = commodity?.name ?? extracted.commodityId;
  const unit = commodity?.unit ?? '';
  const currency = commodity?.currency ?? 'USD';
  const counterpartyName = counterparty?.name ?? extracted.counterpartyId;
  const day = extracted.tradeDate.slice(0, 10);
  const compactDay = day.replace(/-/g, '');

  switch (channel) {
    case 'email':
      return [
        `Subject: Trade Confirmation — Ref ${ref}`,
        '',
        `We hereby confirm the following transaction agreed between our two parties:`,
        '',
        `  Direction:    ${extracted.side}`,
        `  Commodity:    ${commodityName}`,
        `  Quantity:     ${extracted.volume.toLocaleString()} ${unit}`,
        `  Price:        ${extracted.price.toFixed(2)} ${currency}`,
        `  Counterparty: ${counterpartyName}`,
        `  Trade date:   ${day}`,
        '',
        `Kindly review and revert with any discrepancies within 24 hours.`,
      ].join('\n');
    case 'edi':
      return [
        `UNH+${ref}+TRADCONF:D:96A:UN`,
        `TRD+${extracted.side}+${extracted.commodityId}+${extracted.volume}+${extracted.price.toFixed(2)}+${currency}`,
        `PTY+BY+${extracted.side === 'BUY' ? 'TFG' : counterparty?.id.toUpperCase()}`,
        `PTY+SE+${extracted.side === 'SELL' ? 'TFG' : counterparty?.id.toUpperCase()}`,
        `DTM+${compactDay}`,
        `UNT+5+${ref}`,
      ].join('\n');
    case 'swift':
      return [
        `:20:${ref}`,
        `:22A:NEWT`,
        `:17R:${extracted.side === 'BUY' ? 'S' : 'B'}`,
        `:30T:${compactDay}`,
        `:32B:${currency}${extracted.price.toFixed(2)}`,
        `:19A:${extracted.volume}`,
        `:82A:${counterparty?.id.toUpperCase() ?? extracted.counterpartyId.toUpperCase()}`,
      ].join('\n');
  }
}
