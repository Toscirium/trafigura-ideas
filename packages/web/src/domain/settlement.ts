import type { Invoice, InvoiceIssueField, InvoiceType } from 'shared';

export const INVOICE_TYPE_LABEL: Record<InvoiceType, string> = {
  commodity: 'Commodity',
  freight: 'Freight',
  demurrage: 'Demurrage',
};

export const INVOICE_ISSUE_FIELD_LABEL: Record<InvoiceIssueField, string> = {
  amount: 'Amount',
  quantity: 'Quantity',
  unitPrice: 'Unit price',
  dueDate: 'Due date',
  counterparty: 'Counterparty',
};

export function isOverdue(invoice: Invoice, nowMs: number): boolean {
  return !invoice.paid && Date.parse(invoice.dueDate) < nowMs;
}

export function sortByIssuedDesc(invoices: Invoice[]): Invoice[] {
  return [...invoices].sort((a, b) => Date.parse(b.issuedAt) - Date.parse(a.issuedAt));
}

export function totalOutstandingUsd(invoices: Invoice[]): number {
  return invoices.filter((i) => !i.paid).reduce((sum, i) => sum + i.invoicedAmountUsd, 0);
}
