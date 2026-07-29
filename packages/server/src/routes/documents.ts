import type { FastifyInstance } from 'fastify';
import type { ReviewDocumentInput } from 'shared';
import { documentStore } from '../state/documentStore.js';
import { authenticate, requireRole } from '../plugins/auth.js';
import { auditStore } from '../state/auditStore.js';

export function registerDocumentRoutes(app: FastifyInstance): void {
  app.get('/api/documents/snapshot', async () => documentStore.snapshot());

  app.patch<{ Params: { id: string }; Body: ReviewDocumentInput }>(
    '/api/documents/:id/review',
    { preHandler: [authenticate, requireRole('admin', 'compliance', 'trader')] },
    async (req, reply) => {
      const { decision } = req.body;
      const updated = documentStore.review(req.params.id, decision, req.user!.displayName);
      if (!updated) {
        reply.code(404);
        return { error: 'Document not found' };
      }
      auditStore.record(req.user!, `document.${decision}`, 'document', updated.id, { docType: updated.docType });
      return updated;
    },
  );
}
