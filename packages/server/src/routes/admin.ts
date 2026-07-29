import type { FastifyInstance } from 'fastify';
import type { Counterparty, ImportCounterpartiesInput } from 'shared';
import { counterpartyStore } from '../state/counterpartyStore.js';
import { authenticate, requireRole } from '../plugins/auth.js';
import { auditStore } from '../state/auditStore.js';

function slugId(name: string): string {
  return `cp-${name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')}`;
}

export function registerAdminRoutes(app: FastifyInstance): void {
  app.post<{ Body: ImportCounterpartiesInput }>(
    '/api/admin/counterparties/import',
    { preHandler: [authenticate, requireRole('admin')] },
    async (req, reply) => {
      const rows = req.body?.counterparties ?? [];
      if (rows.length === 0) {
        reply.code(400);
        return { error: 'No counterparties provided' };
      }

      const counterparties: Counterparty[] = rows.map((r) => ({
        id: slugId(r.name),
        name: r.name,
        tier: r.tier,
        region: r.region,
      }));

      const result = counterpartyStore.replaceAll(counterparties);
      auditStore.record(req.user!, 'counterparties.import', 'counterparty', 'bulk', { count: result.length });
      reply.code(201);
      return { counterparties: result };
    },
  );
}
