import type { FastifyInstance } from 'fastify';
import type { AcknowledgeInvoiceInput } from 'shared';
import { settlementStore } from '../state/settlementStore.js';
import { authenticate, requireRole } from '../plugins/auth.js';
import { auditStore } from '../state/auditStore.js';

export function registerSettlementRoutes(app: FastifyInstance): void {
  app.get('/api/settlement/snapshot', async () => settlementStore.snapshot());

  app.patch<{ Params: { id: string }; Body: AcknowledgeInvoiceInput }>(
    '/api/invoices/:id/acknowledge',
    { preHandler: [authenticate, requireRole('admin', 'settlements', 'credit_risk')] },
    async (req, reply) => {
      const updated = settlementStore.acknowledge(req.params.id, req.body?.note);
      if (!updated) {
        reply.code(404);
        return { error: 'Invoice not found' };
      }
      auditStore.record(req.user!, 'invoice.acknowledge', 'invoice', updated.id, { note: req.body?.note });
      return updated;
    },
  );

  app.patch<{ Params: { id: string } }>(
    '/api/invoices/:id/pay',
    { preHandler: [authenticate, requireRole('admin', 'settlements')] },
    async (req, reply) => {
      const updated = settlementStore.markPaid(req.params.id);
      if (!updated) {
        reply.code(404);
        return { error: 'Invoice not found' };
      }
      auditStore.record(req.user!, 'invoice.pay', 'invoice', updated.id, { amountUsd: updated.invoicedAmountUsd });
      return updated;
    },
  );
}
