import type { Counterparty } from 'shared';
import { db } from './db.js';

export function countCounterparties(): number {
  const row = db.prepare('SELECT COUNT(*) as n FROM counterparties').get() as { n: number };
  return row.n;
}

export function listCounterparties(): Counterparty[] {
  return db.prepare('SELECT * FROM counterparties').all() as Counterparty[];
}

export function insertMany(counterparties: Counterparty[]): void {
  const insert = db.prepare('INSERT INTO counterparties (id, name, tier, region) VALUES (@id, @name, @tier, @region)');
  const tx = db.transaction((rows: Counterparty[]) => {
    for (const row of rows) insert.run(row);
  });
  tx(counterparties);
}

export function replaceAll(counterparties: Counterparty[]): void {
  const tx = db.transaction((rows: Counterparty[]) => {
    db.prepare('DELETE FROM counterparties').run();
    insertMany(rows);
  });
  tx(counterparties);
}
