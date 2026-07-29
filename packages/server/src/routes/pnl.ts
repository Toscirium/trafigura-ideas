import type { FastifyInstance } from 'fastify';
import type { PnlHistoryPayload } from 'shared';
import * as pnlSnapshotRepo from '../db/pnlSnapshotRepo.js';
import { authenticate } from '../plugins/auth.js';

export function registerPnlRoutes(app: FastifyInstance): void {
  app.get('/api/pnl/history', { preHandler: authenticate }, async (): Promise<PnlHistoryPayload> => {
    const rows = pnlSnapshotRepo.list();
    return {
      points: rows.map((r) => ({ takenAt: r.takenAt, deskId: r.deskId as PnlHistoryPayload['points'][number]['deskId'], pnlUsd: r.pnlUsd, netVolume: r.netVolume })),
    };
  });
}
