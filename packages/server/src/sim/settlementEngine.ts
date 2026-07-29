import { nanoid } from 'nanoid';
import type { Invoice, InvoiceType } from 'shared';
import { store } from '../state/store.js';
import { schedulingStore } from '../state/schedulingStore.js';
import { settlementStore } from '../state/settlementStore.js';
import {
  buildInvoiceAmount,
  commodityInvoiceExpectedAmount,
  demurrageInvoiceExpectedAmount,
  freightInvoiceExpectedAmount,
  invoiceNumber,
} from '../domain/settlement.js';
import { clock } from './clock.js';

const TICK_MS = 4000;

const INVOICE_PREFIX: Record<InvoiceType, string> = { commodity: 'INV', freight: 'FRT', demurrage: 'DEM' };

function buildInvoice(
  type: InvoiceType,
  deskId: Invoice['deskId'],
  counterpartyId: string,
  sourceTradeId: string | null,
  sourceVoyageId: string | null,
  expectedAmountUsd: number,
): Invoice {
  const { paymentMethod, dueDate, invoicedAmountUsd, issues } = buildInvoiceAmount(expectedAmountUsd);
  return {
    id: nanoid(10),
    invoiceNumber: invoiceNumber(INVOICE_PREFIX[type]),
    type,
    issuedAt: new Date().toISOString(),
    dueDate,
    deskId,
    counterpartyId,
    sourceTradeId,
    sourceVoyageId,
    currency: 'USD',
    expectedAmountUsd,
    invoicedAmountUsd,
    paymentMethod,
    matchStatus: issues.length > 0 ? 'issues' : 'matched',
    issues,
    acknowledged: false,
    acknowledgedNote: null,
    paid: false,
    paidAt: null,
  };
}

function tryCommodityInvoice(): void {
  const eligible = store.trades.filter((t) => !settlementStore.hasInvoiceForTrade(t.id));
  if (eligible.length === 0) return;
  const trade = eligible[Math.floor(Math.random() * eligible.length)]!;
  const amount = commodityInvoiceExpectedAmount(trade);
  settlementStore.addInvoice(buildInvoice('commodity', trade.deskId, trade.counterpartyId, trade.id, null, amount));
}

function tryVoyageInvoices(): void {
  // Freight/demurrage are invoiced once a voyage is fixed, regardless of load/discharge
  // status — same simulation looseness the document-intelligence engine uses when
  // picking voyages for charter-party paperwork (this is a demo dataset, not a physical clock).
  const voyages = schedulingStore.listVoyages();

  for (const voyage of voyages) {
    if (!settlementStore.hasFreightInvoiceForVoyage(voyage.id)) {
      const amount = freightInvoiceExpectedAmount(voyage);
      settlementStore.addInvoice(
        buildInvoice('freight', voyage.deskId, voyage.counterpartyId, null, voyage.id, amount),
      );
    }
    if (voyage.demurrageUsd > 0 && !settlementStore.hasDemurrageInvoiceForVoyage(voyage.id)) {
      const amount = demurrageInvoiceExpectedAmount(voyage);
      settlementStore.addInvoice(
        buildInvoice('demurrage', voyage.deskId, voyage.counterpartyId, null, voyage.id, amount),
      );
    }
  }
}

function tick(): void {
  if (!clock.running) return;
  if (Math.random() < 0.5) tryCommodityInvoice();
  tryVoyageInvoices();
}

export function startSettlementEngine(): void {
  setInterval(() => tick(), clock.scaledInterval(TICK_MS));
}
