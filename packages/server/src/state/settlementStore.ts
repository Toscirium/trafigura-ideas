import { EventEmitter } from 'node:events';
import type { Invoice, SettlementSnapshotPayload } from 'shared';
import * as invoiceRepo from '../db/invoiceRepo.js';

class SettlementStore extends EventEmitter {
  addInvoice(invoice: Invoice): void {
    invoiceRepo.insert(invoice);
    this.emit('invoiceUpdate', invoice);
  }

  acknowledge(id: string, note: string | undefined): Invoice | undefined {
    const invoice = invoiceRepo.getById(id);
    if (!invoice) return undefined;
    invoice.acknowledged = true;
    invoice.acknowledgedNote = note ?? null;
    invoiceRepo.update(invoice);
    this.emit('invoiceUpdate', invoice);
    return invoice;
  }

  markPaid(id: string): Invoice | undefined {
    const invoice = invoiceRepo.getById(id);
    if (!invoice) return undefined;
    invoice.paid = true;
    invoice.paidAt = new Date().toISOString();
    invoiceRepo.update(invoice);
    this.emit('invoiceUpdate', invoice);
    return invoice;
  }

  hasInvoiceForTrade(tradeId: string): boolean {
    return invoiceRepo.hasInvoiceForTrade(tradeId);
  }

  hasFreightInvoiceForVoyage(voyageId: string): boolean {
    return invoiceRepo.hasFreightInvoiceForVoyage(voyageId);
  }

  hasDemurrageInvoiceForVoyage(voyageId: string): boolean {
    return invoiceRepo.hasDemurrageInvoiceForVoyage(voyageId);
  }

  snapshot(): SettlementSnapshotPayload {
    return { invoices: invoiceRepo.list() };
  }
}

export const settlementStore = new SettlementStore();
