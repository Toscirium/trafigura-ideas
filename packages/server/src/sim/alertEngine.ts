import type { ComplianceCase, TradeConfirmation } from 'shared';
import { crmStore } from '../state/crmStore.js';
import { counterpartyStore } from '../state/counterpartyStore.js';
import { settlementStore } from '../state/settlementStore.js';
import { alertStore } from '../state/alertStore.js';
import { currentExposureUsd } from '../domain/creditCheck.js';
import { clock } from './clock.js';

const TICK_MS = 10000;
const CREDIT_CRITICAL_PCT = 0.9;

/** Entities currently over threshold — alert once on crossing, not every tick. */
const creditAlerting = new Set<string>();
const overdueAlerted = new Set<string>();

function counterpartyName(id: string): string {
  return counterpartyStore.list().find((c) => c.id === id)?.name ?? id;
}

function checkCredit(): void {
  for (const profile of crmStore.snapshot().profiles) {
    const exposure = currentExposureUsd(profile.counterpartyId);
    const pct = profile.creditLimitUsd > 0 ? exposure / profile.creditLimitUsd : 0;

    if (pct >= CREDIT_CRITICAL_PCT) {
      if (!creditAlerting.has(profile.counterpartyId)) {
        creditAlerting.add(profile.counterpartyId);
        alertStore.raise(
          'credit',
          'critical',
          `${counterpartyName(profile.counterpartyId)} credit exposure at ${Math.round(pct * 100)}% of limit`,
          'counterparty',
          profile.counterpartyId,
        );
      }
    } else {
      creditAlerting.delete(profile.counterpartyId);
    }
  }
}

function checkOverdueInvoices(): void {
  const now = Date.now();
  for (const invoice of settlementStore.snapshot().invoices) {
    if (invoice.paid) {
      overdueAlerted.delete(invoice.id);
      continue;
    }
    if (Date.parse(invoice.dueDate) < now && !overdueAlerted.has(invoice.id)) {
      overdueAlerted.add(invoice.id);
      alertStore.raise('settlement', 'warning', `Invoice ${invoice.invoiceNumber} is overdue`, 'invoice', invoice.id);
    }
  }
}

function tick(): void {
  if (!clock.running) return;
  checkCredit();
  checkOverdueInvoices();
}

export function startAlertEngine(): void {
  setInterval(() => tick(), clock.scaledInterval(TICK_MS));
}

export function alertHighPriorityCase(caseRecord: ComplianceCase): void {
  if (caseRecord.priority !== 'high') return;
  alertStore.raise(
    'compliance',
    'critical',
    `High-priority screening hit: ${caseRecord.entityName} (${caseRecord.listType})`,
    'complianceCase',
    caseRecord.id,
  );
}

export function alertCriticalBreak(confirmation: TradeConfirmation): void {
  if (confirmation.status !== 'break') return;
  if (!confirmation.breaks.some((b) => b.severity === 'critical')) return;
  alertStore.raise(
    'reconciliation',
    'critical',
    `Critical reconciliation break on confirmation ${confirmation.id}`,
    'confirmation',
    confirmation.id,
  );
}
