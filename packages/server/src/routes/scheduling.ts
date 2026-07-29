import type { FastifyInstance } from 'fastify';
import type { NewVoyageInput, VoyageReschedulePatch } from 'shared';
import { schedulingStore } from '../state/schedulingStore.js';
import { authenticate } from '../plugins/auth.js';
import { auditStore } from '../state/auditStore.js';

export function registerSchedulingRoutes(app: FastifyInstance): void {
  app.get('/api/scheduling/snapshot', async () => schedulingStore.snapshot());

  app.post<{ Body: NewVoyageInput }>('/api/voyages', { preHandler: authenticate }, async (req, reply) => {
    const voyage = schedulingStore.createVoyage(req.body);
    auditStore.record(req.user!, 'voyage.create', 'voyage', voyage.id, { vesselId: voyage.vesselId });
    reply.code(201);
    return voyage;
  });

  app.patch<{ Params: { id: string }; Body: VoyageReschedulePatch }>(
    '/api/voyages/:id',
    { preHandler: authenticate },
    async (req, reply) => {
      const updated = schedulingStore.rescheduleVoyage(req.params.id, req.body);
      if (!updated) {
        reply.code(404);
        return { error: 'Voyage not found' };
      }
      auditStore.record(req.user!, 'voyage.reschedule', 'voyage', updated.id, req.body);
      return updated;
    },
  );
}
