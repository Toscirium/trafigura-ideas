import { EventEmitter } from 'node:events';
import { nanoid } from 'nanoid';
import { PORTS, VESSELS, VOYAGE_SEEDS } from 'shared';
import type { NewVoyageInput, PortCongestion, SchedulingSnapshotPayload, Voyage, VoyageReschedulePatch } from 'shared';
import * as voyageRepo from '../db/voyageRepo.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

function seedIfEmpty(): void {
  if (voyageRepo.countVoyages() > 0) return;

  const now = Date.now();
  for (const seed of VOYAGE_SEEDS) {
    const laycanStartMs = now + seed.laycanOffsetDays * DAY_MS;
    const laycanEndMs = laycanStartMs + 2 * DAY_MS;
    const loadStartMs = laycanStartMs + 0.5 * DAY_MS;
    const loadEndMs = loadStartMs + seed.loadDurationDays * DAY_MS;
    const dischargeStartMs = loadEndMs + seed.transitDays * DAY_MS;
    const dischargeEndMs = dischargeStartMs + seed.loadDurationDays * DAY_MS;

    voyageRepo.insertVoyage({
      id: nanoid(10),
      vesselId: seed.vesselId,
      deskId: seed.deskId,
      commodityId: seed.commodityId,
      counterpartyId: seed.counterpartyId,
      loadPortId: seed.loadPortId,
      dischargePortId: seed.dischargePortId,
      transitDays: seed.transitDays,
      laycanStart: iso(laycanStartMs),
      laycanEnd: iso(laycanEndMs),
      plannedLoadStart: iso(loadStartMs),
      plannedLoadEnd: iso(loadEndMs),
      plannedDischargeStart: iso(dischargeStartMs),
      plannedDischargeEnd: iso(dischargeEndMs),
      cargoVolume: seed.cargoVolume,
      cargoUnit: seed.cargoUnit,
      freightRateBasis: seed.freightRateBasis,
      freightRateUsd: seed.freightRateUsd,
      demurrageRateUsdPerDay: seed.demurrageRateUsdPerDay,
      dispatchRateUsdPerDay: seed.dispatchRateUsdPerDay,
      laytimeAllowedHours: seed.laytimeAllowedHours,
      bunkerCostUsd: seed.bunkerCostUsd,
      portCostsUsd: seed.portCostsUsd,
      otherCostsUsd: seed.otherCostsUsd,
      status: seed.laycanOffsetDays < 0 ? 'laden' : 'scheduled',
      updatedAt: iso(now),
    });
  }
}

class SchedulingStore extends EventEmitter {
  readonly portCongestion = new Map<string, PortCongestion>();

  constructor() {
    super();
    seedIfEmpty();
  }

  listVessels() {
    return VESSELS;
  }

  listPorts() {
    return PORTS;
  }

  listVoyages(): Voyage[] {
    return voyageRepo.listVoyages();
  }

  getVoyage(id: string): Voyage | undefined {
    return voyageRepo.getVoyage(id);
  }

  createVoyage(input: NewVoyageInput): Voyage {
    const now = new Date().toISOString();
    const loadEndMs = Date.parse(input.plannedLoadEnd);
    const voyage = voyageRepo.insertVoyage({
      id: nanoid(10),
      ...input,
      plannedDischargeStart: iso(loadEndMs + input.transitDays * DAY_MS),
      plannedDischargeEnd: iso(loadEndMs + input.transitDays * DAY_MS + 1.5 * DAY_MS),
      status: 'scheduled',
      updatedAt: now,
    });
    this.emit('voyageUpdate', voyage);
    return voyage;
  }

  /**
   * Applies a reschedule/resize from the Gantt board. Moving plannedLoadStart shifts
   * the whole voyage (duration preserved); changing plannedLoadEnd or
   * plannedDischargeEnd changes time spent in port, which cascades into the
   * discharge call's start (via transitDays) and into laytime/demurrage/dispatch.
   */
  rescheduleVoyage(id: string, patch: VoyageReschedulePatch): Voyage | undefined {
    const existing = voyageRepo.getVoyage(id);
    if (!existing) return undefined;

    const next: VoyageReschedulePatch & Pick<Voyage, 'plannedLoadStart' | 'plannedLoadEnd'> = {
      plannedLoadStart: existing.plannedLoadStart,
      plannedLoadEnd: existing.plannedLoadEnd,
      ...patch,
    };

    let loadStartMs = Date.parse(next.plannedLoadStart);
    let loadEndMs = Date.parse(next.plannedLoadEnd);

    if (patch.plannedLoadStart && !patch.plannedLoadEnd) {
      // Whole-voyage drag: preserve original load duration.
      const originalDurationMs = Date.parse(existing.plannedLoadEnd) - Date.parse(existing.plannedLoadStart);
      loadEndMs = loadStartMs + originalDurationMs;
    }
    if (loadEndMs <= loadStartMs) loadEndMs = loadStartMs + 0.25 * DAY_MS;

    const dischargeStartMs = loadEndMs + existing.transitDays * DAY_MS;
    const originalDischargeDurationMs =
      Date.parse(existing.plannedDischargeEnd) - Date.parse(existing.plannedDischargeStart);
    let dischargeEndMs = patch.plannedDischargeEnd
      ? Date.parse(patch.plannedDischargeEnd)
      : dischargeStartMs + originalDischargeDurationMs;
    if (dischargeEndMs <= dischargeStartMs) dischargeEndMs = dischargeStartMs + 0.25 * DAY_MS;

    const updated = voyageRepo.updateVoyage(id, {
      plannedLoadStart: iso(loadStartMs),
      plannedLoadEnd: iso(loadEndMs),
      plannedDischargeStart: iso(dischargeStartMs),
      plannedDischargeEnd: iso(dischargeEndMs),
      status: patch.status ?? existing.status,
    });

    if (updated) this.emit('voyageUpdate', updated);
    return updated;
  }

  upsertPortCongestion(congestion: PortCongestion): void {
    this.portCongestion.set(congestion.portId, congestion);
    this.emit('portCongestionUpdate', congestion);
  }

  snapshot(): SchedulingSnapshotPayload {
    return {
      vessels: this.listVessels(),
      ports: this.listPorts(),
      voyages: this.listVoyages(),
      portCongestion: Array.from(this.portCongestion.values()),
    };
  }
}

export const schedulingStore = new SchedulingStore();
