import type { FastifyInstance } from 'fastify';
import type { CaptureTradeRequest, ResolveBreakInput } from 'shared';
import { reconciliationStore } from '../state/reconciliationStore.js';
import { captureTrade } from '../domain/tradeCapture.js';
import { checkCreditLimit } from '../domain/creditCheck.js';
import { authenticate } from '../plugins/auth.js';
import { auditStore } from '../state/auditStore.js';

export function registerReconciliationRoutes(app: FastifyInstance): void {
  app.get('/api/reconciliation/snapshot', async () => reconciliationStore.snapshot());

  app.post<{ Body: CaptureTradeRequest }>('/api/trades', { preHandler: authenticate }, async (req, reply) => {
    const { force, ...tradeInput } = req.body;
    const check = checkCreditLimit(tradeInput);
    if (!check.ok && !force) {
      reply.code(409);
      return { error: 'credit_limit_exceeded', check };
    }

    const trade = captureTrade(tradeInput);
    auditStore.record(req.user!, 'trade.capture', 'trade', trade.id, {
      counterpartyId: trade.counterpartyId,
      side: trade.side,
      volume: trade.volume,
      price: trade.price,
      forced: Boolean(force),
    });
    reply.code(201);
    return trade;
  });

  app.patch<{ Params: { id: string }; Body: ResolveBreakInput }>(
    '/api/confirmations/:id/resolve',
    { preHandler: authenticate },
    async (req, reply) => {
      const updated = reconciliationStore.resolve(req.params.id, req.body?.note);
      if (!updated) {
        reply.code(404);
        return { error: 'Confirmation not found' };
      }
      auditStore.record(req.user!, 'confirmation.resolve', 'confirmation', updated.id, { note: req.body?.note });
      return updated;
    },
  );
}
