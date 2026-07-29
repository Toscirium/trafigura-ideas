import type { InvoiceLineIssue, PaymentMethod, Trade, Voyage } from 'shared';

const PAYMENT_METHODS: PaymentMethod[] = ['wire', 'letter-of-credit', 'open-account'];
const DUE_DAYS: Record<PaymentMethod, number> = { wire: 3, 'letter-of-credit': 14, 'open-account': 30 };

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function daysFromNow(days: number, fromMs = Date.now()): string {
  return new Date(fromMs + days * 24 * 60 * 60 * 1000).toISOString();
}

export function invoiceNumber(prefix: string): string {
  return `${prefix}-${Math.floor(100000 + Math.random() * 899999)}`;
}

export interface InvoiceBuildResult {
  paymentMethod: PaymentMethod;
  dueDate: string;
  invoicedAmountUsd: number;
  issues: InvoiceLineIssue[];
}

/**
 * Perturbs the invoiced amount away from the expected (trade/voyage-derived) amount on
 * a minority of invoices to simulate manual re-keying errors, FX slippage, or disputed
 * line items — the kind of thing a settlements analyst would otherwise catch by hand
 * comparing two spreadsheets.
 */
export function buildInvoiceAmount(expectedAmountUsd: number): InvoiceBuildResult {
  const paymentMethod = pick(PAYMENT_METHODS);
  const dueDate = daysFromNow(DUE_DAYS[paymentMethod]);
  const issues: InvoiceLineIssue[] = [];

  const scenario = Math.random();
  let invoicedAmountUsd = Math.round(expectedAmountUsd);
  if (scenario < 0.2) {
    const pct = 0.01 + Math.random() * 0.06;
    const sign = Math.random() < 0.5 ? -1 : 1;
    invoicedAmountUsd = Math.round(expectedAmountUsd * (1 + sign * pct));
  }

  const diffPct = Math.abs(invoicedAmountUsd - expectedAmountUsd) / Math.max(expectedAmountUsd, 1);
  if (diffPct > 0.005) {
    issues.push({
      field: 'amount',
      expected: `$${Math.round(expectedAmountUsd).toLocaleString()}`,
      invoiced: `$${invoicedAmountUsd.toLocaleString()}`,
      severity: diffPct > 0.03 ? 'critical' : 'warning',
    });
  }

  return { paymentMethod, dueDate, invoicedAmountUsd, issues };
}

export function commodityInvoiceExpectedAmount(trade: Trade): number {
  return trade.volume * trade.price;
}

export function freightInvoiceExpectedAmount(voyage: Voyage): number {
  return voyage.freightRevenueUsd;
}

export function demurrageInvoiceExpectedAmount(voyage: Voyage): number {
  return voyage.demurrageUsd;
}
