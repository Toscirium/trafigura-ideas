import type { FastifyInstance } from 'fastify';
import { auditStore } from '../state/auditStore.js';
import { authenticate, requireRole } from '../plugins/auth.js';

export function registerAuditRoutes(app: FastifyInstance): void {
  app.get(
    '/api/audit/snapshot',
    { preHandler: [authenticate, requireRole('admin', 'compliance', 'credit_risk')] },
    async () => auditStore.snapshot(),
  );
}
