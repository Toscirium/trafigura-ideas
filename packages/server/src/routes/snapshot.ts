import type { FastifyInstance } from 'fastify';
import { store } from '../state/store.js';

export function registerSnapshotRoute(app: FastifyInstance): void {
  app.get('/api/snapshot', async () => store.snapshot());
  app.get('/api/health', async () => ({ ok: true }));
}
