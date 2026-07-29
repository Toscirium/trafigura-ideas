import { db } from './db.js';

const MAX_ROWS = 5000;

export interface PnlSnapshotRow {
  id: string;
  takenAt: string;
  deskId: string;
  pnlUsd: number;
  netVolume: number;
}

export function insertMany(rows: PnlSnapshotRow[]): void {
  const insert = db.prepare('INSERT INTO pnl_snapshots (id, takenAt, deskId, pnlUsd, netVolume) VALUES (@id, @takenAt, @deskId, @pnlUsd, @netVolume)');
  const tx = db.transaction((items: PnlSnapshotRow[]) => {
    for (const row of items) insert.run(row);
  });
  tx(rows);

  const count = (db.prepare('SELECT COUNT(*) as n FROM pnl_snapshots').get() as { n: number }).n;
  if (count > MAX_ROWS) {
    db.prepare('DELETE FROM pnl_snapshots WHERE id IN (SELECT id FROM pnl_snapshots ORDER BY takenAt ASC LIMIT ?)').run(
      count - MAX_ROWS,
    );
  }
}

export function list(): PnlSnapshotRow[] {
  return db.prepare('SELECT * FROM pnl_snapshots ORDER BY takenAt ASC').all() as PnlSnapshotRow[];
}
