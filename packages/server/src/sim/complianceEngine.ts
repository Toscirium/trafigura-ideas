import { nanoid } from 'nanoid';
import type { ComplianceCase, ScreeningEntityType } from 'shared';
import { store } from '../state/store.js';
import { schedulingStore } from '../state/schedulingStore.js';
import { complianceStore } from '../state/complianceStore.js';
import { buildScreeningHit } from '../domain/compliance.js';
import { alertHighPriorityCase } from './alertEngine.js';
import { clock } from './clock.js';

const TICK_MS = 9000;
const HIT_PROBABILITY = 0.35;

function tick(): void {
  if (!clock.running) return;
  if (Math.random() > HIT_PROBABILITY) return;

  const entityType: ScreeningEntityType = Math.random() < 0.7 ? 'counterparty' : 'vessel';
  const hit = buildScreeningHit(entityType, store.trades, schedulingStore.listVoyages());

  const now = new Date().toISOString();
  const caseRecord: ComplianceCase = {
    id: nanoid(10),
    createdAt: now,
    updatedAt: now,
    status: 'open',
    assignedTo: null,
    ...hit,
  };
  complianceStore.addCase(caseRecord);
  alertHighPriorityCase(caseRecord);
}

export function startComplianceEngine(): void {
  setInterval(() => tick(), clock.scaledInterval(TICK_MS));
}
