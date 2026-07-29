import type { FastifyInstance } from 'fastify';
import type { AssignCaseInput, NewCaseCommentInput, UpdateCaseInput } from 'shared';
import { complianceStore } from '../state/complianceStore.js';
import { authenticate, requireRole } from '../plugins/auth.js';
import { auditStore } from '../state/auditStore.js';

export function registerComplianceRoutes(app: FastifyInstance): void {
  app.get('/api/compliance/snapshot', async () => complianceStore.snapshot());

  app.patch<{ Params: { id: string }; Body: UpdateCaseInput }>(
    '/api/compliance/cases/:id/status',
    { preHandler: [authenticate, requireRole('admin', 'compliance')] },
    async (req, reply) => {
      const { status, note } = req.body;
      const updated = complianceStore.updateStatus(req.params.id, status, req.user!.displayName, note);
      if (!updated) {
        reply.code(404);
        return { error: 'Case not found' };
      }
      auditStore.record(req.user!, 'case.statusChange', 'complianceCase', updated.id, { status, note });
      return updated;
    },
  );

  app.patch<{ Params: { id: string }; Body: AssignCaseInput }>(
    '/api/compliance/cases/:id/assign',
    { preHandler: [authenticate, requireRole('admin', 'compliance')] },
    async (req, reply) => {
      const { assignedTo } = req.body;
      const updated = complianceStore.assign(req.params.id, assignedTo, req.user!.displayName);
      if (!updated) {
        reply.code(404);
        return { error: 'Case not found' };
      }
      auditStore.record(req.user!, 'case.assign', 'complianceCase', updated.id, { assignedTo });
      return updated;
    },
  );

  app.post<{ Params: { id: string }; Body: NewCaseCommentInput }>(
    '/api/compliance/cases/:id/comments',
    { preHandler: [authenticate, requireRole('admin', 'compliance')] },
    async (req, reply) => {
      const entry = complianceStore.comment(req.params.id, req.user!.displayName, req.body.body);
      if (!entry) {
        reply.code(404);
        return { error: 'Case not found' };
      }
      auditStore.record(req.user!, 'case.comment', 'complianceCase', req.params.id, { body: req.body.body });
      reply.code(201);
      return entry;
    },
  );
}
