import { EventEmitter } from 'node:events';
import { COUNTERPARTIES } from 'shared';
import type { Counterparty } from 'shared';
import * as counterpartyRepo from '../db/counterpartyRepo.js';

function seedIfEmpty(): void {
  if (counterpartyRepo.countCounterparties() > 0) return;
  counterpartyRepo.insertMany(COUNTERPARTIES);
}

class CounterpartyStore extends EventEmitter {
  private cache: Counterparty[];

  constructor() {
    super();
    seedIfEmpty();
    this.cache = counterpartyRepo.listCounterparties();
  }

  list(): Counterparty[] {
    return this.cache;
  }

  /** Replaces the full counterparty book — the "bring your own data" import path. */
  replaceAll(counterparties: Counterparty[]): Counterparty[] {
    counterpartyRepo.replaceAll(counterparties);
    this.cache = counterpartyRepo.listCounterparties();
    this.emit('counterpartiesUpdate', this.cache);
    return this.cache;
  }
}

export const counterpartyStore = new CounterpartyStore();
