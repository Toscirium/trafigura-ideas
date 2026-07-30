import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import { isOriginAllowed } from './security/corsOrigins.js';

// Load packages/server/.env (gitignored) before anything reads process.env — mainly ANTHROPIC_API_KEY.
const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env');
if (existsSync(envPath)) process.loadEnvFile(envPath);
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
import { seedUsersIfEmpty } from './domain/userSeed.js';
import { createSocketServer } from './ws/socket.js';
import { registerHandlers } from './ws/handlers.js';
import { startMarketEngine } from './sim/marketEngine.js';
import { startTradeEngine } from './sim/tradeEngine.js';
import { startPortCongestionEngine } from './sim/portCongestionEngine.js';
import { startConfirmationEngine } from './sim/confirmationEngine.js';
import { startDocumentEngine } from './sim/documentEngine.js';
import { startSettlementEngine } from './sim/settlementEngine.js';
import { startComplianceEngine } from './sim/complianceEngine.js';
import { startAlertEngine } from './sim/alertEngine.js';
import { startPnlHistoryEngine } from './sim/pnlHistoryEngine.js';

const PORT = Number(process.env.PORT ?? 4000);
// Loopback-only by default — this API has no TLS and ships hardcoded demo credentials,
// so it shouldn't be reachable from other devices on the network unless explicitly opted in.
const HOST = process.env.HOST ?? '127.0.0.1';

async function main() {
  seedUsersIfEmpty();

  const app = Fastify({ logger: true });
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

  const io = createSocketServer(app.server);
  registerHandlers(io);

  startMarketEngine();
  startTradeEngine();
  startPortCongestionEngine();
  startConfirmationEngine();
  startDocumentEngine();
  startSettlementEngine();
  startComplianceEngine();
  startAlertEngine();
  startPnlHistoryEngine();

  await app.listen({ port: PORT, host: HOST });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
