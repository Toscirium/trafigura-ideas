import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import { isOriginAllowed } from './security/corsOrigins.js';
import { registerSnapshotRoute } from './routes/snapshot.js';
import { registerSchedulingRoutes } from './routes/scheduling.js';
import { registerReconciliationRoutes } from './routes/reconciliation.js';
import { registerCrmRoutes } from './routes/crm.js';
import { registerDocumentRoutes } from './routes/documents.js';
import { registerSettlementRoutes } from './routes/settlement.js';
import { registerComplianceRoutes } from './routes/compliance.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerAuditRoutes } from './routes/audit.js';
import { registerAdminRoutes } from './routes/admin.js';
import { registerPnlRoutes } from './routes/pnl.js';

/**
 * Builds and returns a fully-configured Fastify instance (plugins + routes registered,
 * `.ready()` awaited) without listening on a port or starting any sim engines — the
 * seam that lets tests `.inject()` against real routes without a real HTTP server or
 * the simulation's background timers running.
 */
export async function buildApp(options: { logger?: boolean } = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false });
  await app.register(cors, { origin: (origin, cb) => cb(null, isOriginAllowed(origin)) });
  await app.register(helmet);
  await app.register(rateLimit, { max: 300, timeWindow: '1 minute' });

  registerSnapshotRoute(app);
  registerSchedulingRoutes(app);
  registerReconciliationRoutes(app);
  registerCrmRoutes(app);
  registerDocumentRoutes(app);
  registerSettlementRoutes(app);
  registerComplianceRoutes(app);
  registerAuthRoutes(app);
  registerAuditRoutes(app);
  registerAdminRoutes(app);
  registerPnlRoutes(app);

  await app.ready();
  return app;
}
