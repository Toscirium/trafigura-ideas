import { EventEmitter } from 'node:events';
import { nanoid } from 'nanoid';
import type { CaseActivityEntry, CaseStatus, ComplianceCase, ComplianceSnapshotPayload } from 'shared';
import * as complianceRepo from '../db/complianceRepo.js';

class ComplianceStore extends EventEmitter {
  addCase(caseRecord: ComplianceCase): void {
    complianceRepo.insertCase(caseRecord);
    this.emit('caseUpdate', caseRecord);
  }

  private addActivity(caseId: string, author: string, action: CaseActivityEntry['action'], body: string): void {
    const entry: CaseActivityEntry = { id: nanoid(10), caseId, author, action, body, createdAt: new Date().toISOString() };
    complianceRepo.insertActivity(entry);
    this.emit('caseActivityAdded', entry);
  }

  updateStatus(id: string, status: CaseStatus, author: string, note: string | undefined): ComplianceCase | undefined {
    const caseRecord = complianceRepo.getCase(id);
    if (!caseRecord) return undefined;
    const previous = caseRecord.status;
    caseRecord.status = status;
    caseRecord.updatedAt = new Date().toISOString();
    complianceRepo.updateCase(caseRecord);
    this.emit('caseUpdate', caseRecord);
    this.addActivity(id, author, 'status-change', note ? `${previous} → ${status}: ${note}` : `${previous} → ${status}`);
    return caseRecord;
  }

  assign(id: string, assignedTo: string, author: string): ComplianceCase | undefined {
    const caseRecord = complianceRepo.getCase(id);
    if (!caseRecord) return undefined;
    caseRecord.assignedTo = assignedTo;
    caseRecord.updatedAt = new Date().toISOString();
    complianceRepo.updateCase(caseRecord);
    this.emit('caseUpdate', caseRecord);
    this.addActivity(id, author, 'assignment', `Assigned to ${assignedTo}`);
    return caseRecord;
  }

  comment(id: string, author: string, body: string): CaseActivityEntry | undefined {
    if (!complianceRepo.getCase(id)) return undefined;
    const entry: CaseActivityEntry = { id: nanoid(10), caseId: id, author, action: 'comment', body, createdAt: new Date().toISOString() };
    complianceRepo.insertActivity(entry);
    this.emit('caseActivityAdded', entry);
    return entry;
  }

  snapshot(): ComplianceSnapshotPayload {
    return { cases: complianceRepo.listCases(), activity: complianceRepo.listActivity() };
  }
}

export const complianceStore = new ComplianceStore();
