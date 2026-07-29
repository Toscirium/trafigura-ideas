import { nanoid } from 'nanoid';
import { DESKS } from 'shared';
import { store } from '../state/store.js';
import * as pnlSnapshotRepo from '../db/pnlSnapshotRepo.js';
import { clock } from './clock.js';

const TICK_MS = 30_000;

function tick(): void {
  if (!clock.running) return;
  const takenAt = new Date().toISOString();
  const positions = Array.from(store.positions.values());

  const rows = DESKS.map((desk) => {
    const deskPositions = positions.filter((p) => p.deskId === desk.id);
    return {
      id: nanoid(10),
      takenAt,
      deskId: desk.id,
      pnlUsd: deskPositions.reduce((sum, p) => sum + p.mtmPnl, 0),
      netVolume: deskPositions.reduce((sum, p) => sum + p.netVolume, 0),
    };
  });

  pnlSnapshotRepo.insertMany(rows);
}

export function startPnlHistoryEngine(): void {
  setInterval(() => tick(), clock.scaledInterval(TICK_MS));
}
