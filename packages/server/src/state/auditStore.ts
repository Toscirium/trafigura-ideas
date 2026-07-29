import { EventEmitter } from 'node:events';
import { nanoid } from 'nanoid';
import type { AuditLogEntry, AuditSnapshotPayload, AuthUser } from 'shared';
import * as auditRepo from '../db/auditRepo.js';

class AuditStore extends EventEmitter {
  record(user: AuthUser, action: string, entityType: string, entityId: string, details?: unknown): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: nanoid(10),
      timestamp: new Date().toISOString(),
      userId: user.id,
      username: user.username,
      role: user.role,
      action,
      entityType,
      entityId,
      details: details !== undefined ? JSON.stringify(details) : null,
    };
    auditRepo.insertEntry(entry);
    this.emit('auditAdded', entry);
    return entry;
  }

  snapshot(): AuditSnapshotPayload {
    return { entries: auditRepo.listEntries() };
  }
}

export const auditStore = new AuditStore();
