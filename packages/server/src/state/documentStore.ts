import { EventEmitter } from 'node:events';
import type { DocumentExtracted, DocumentIntelSnapshotPayload, DocumentStatus, DocumentValidationIssue, TradeDocument } from 'shared';
import * as documentRepo from '../db/documentRepo.js';

class DocumentStore extends EventEmitter {
  addDocument(document: TradeDocument): void {
    documentRepo.insert(document);
    this.emit('documentUpdate', document);
  }

  /** Transitions a 'processing' document to its final state once LLM extraction (or a fallback) resolves. */
  finalize(
    id: string,
    extracted: DocumentExtracted,
    confidence: number,
    status: DocumentStatus,
    issues: DocumentValidationIssue[],
  ): TradeDocument | undefined {
    documentRepo.finalize(id, extracted, confidence, status, issues);
    const document = documentRepo.getById(id);
    if (document) this.emit('documentUpdate', document);
    return document;
  }

  review(id: string, decision: 'approve' | 'reject', reviewer: string): TradeDocument | undefined {
    const document = documentRepo.getById(id);
    if (!document) return undefined;

    document.status = decision === 'approve' ? 'validated' : 'rejected';
    document.reviewedBy = reviewer;
    document.reviewedAt = new Date().toISOString();
    documentRepo.update(document);
    this.emit('documentUpdate', document);
    return document;
  }

  snapshot(): DocumentIntelSnapshotPayload {
    return { documents: documentRepo.list() };
  }
}

export const documentStore = new DocumentStore();
