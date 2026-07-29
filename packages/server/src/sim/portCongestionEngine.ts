import { PORTS } from 'shared';
import type { PortCongestion } from 'shared';
import { schedulingStore } from '../state/schedulingStore.js';
import { clock } from './clock.js';

const TICK_MS = 4000;

/** Baseline queue pressure per port, purely illustrative (proxy for real AIS/port-authority feeds). */
const BASE_WAITING: Record<string, number> = {
  'port-ras-tanura': 3,
  'port-fujairah': 6,
  'port-rotterdam': 4,
  'port-singapore': 9,
  'port-ningbo': 7,
  'port-houston': 5,
  'port-santos': 8,
  'port-freeport-bhs': 2,
  'port-sodegaura': 3,
  'port-antwerp': 4,
};

function jitter(base: number, spread: number): number {
  return Math.max(0, base + (Math.random() * 2 - 1) * spread);
}

function tick(): void {
  if (!clock.running) return;

  for (const port of PORTS) {
    const base = BASE_WAITING[port.id] ?? 4;
    const vesselsWaiting = Math.round(jitter(base, base * 0.4));
    const avgWaitHours = jitter(base * 6, base * 3);

    const congestion: PortCongestion = {
      portId: port.id,
      vesselsWaiting,
      avgWaitHours,
      updatedAt: new Date().toISOString(),
    };
    schedulingStore.upsertPortCongestion(congestion);
  }
}

export function startPortCongestionEngine(): void {
  tick();
  setInterval(() => tick(), clock.scaledInterval(TICK_MS));
}
