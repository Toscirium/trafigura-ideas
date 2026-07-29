import { EventEmitter } from 'node:events';
import type { ReconciliationSnapshotPayload, TradeConfirmation } from 'shared';
import * as confirmationRepo from '../db/confirmationRepo.js';

class ReconciliationStore extends EventEmitter {
  addConfirmation(confirmation: TradeConfirmation): void {
    confirmationRepo.insert(confirmation);
    this.emit('confirmationUpdate', confirmation);
  }

  resolve(id: string, note: string | undefined): TradeConfirmation | undefined {
    const confirmation = confirmationRepo.getById(id);
    if (!confirmation) return undefined;

    confirmation.resolved = true;
    confirmation.resolutionNote = note ?? null;
    confirmation.resolvedAt = new Date().toISOString();
    confirmationRepo.update(confirmation);
    this.emit('confirmationUpdate', confirmation);
    return confirmation;
  }

  snapshot(): ReconciliationSnapshotPayload {
    return { confirmations: confirmationRepo.list() };
  }
}

export const reconciliationStore = new ReconciliationStore();
