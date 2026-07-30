import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Load packages/server/.env (gitignored) before anything reads process.env — mainly ANTHROPIC_API_KEY.
const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env');
if (existsSync(envPath)) process.loadEnvFile(envPath);

import { buildApp } from './app.js';
import { seedUsersIfEmpty } from './domain/userSeed.js';
import { createSocketServer } from './ws/socket.js';
import { registerHandlers } from './ws/handlers.js';
import { startMarketEngine } from './sim/marketEngine.js';
import { startMarketDataEngine } from './sim/marketDataEngine.js';
import { startTradeEngine } from './sim/tradeEngine.js';
import { startPortCongestionEngine } from './sim/portCongestionEngine.js';
import { startConfirmationEngine } from './sim/confirmationEngine.js';
import { startDocumentEngine } from './sim/documentEngine.js';
import { startSettlementEngine } from './sim/settlementEngine.js';
import { startComplianceEngine } from './sim/complianceEngine.js';
import { startAlertEngine } from './sim/alertEngine.js';
import { startPnlHistoryEngine } from './sim/pnlHistoryEngine.js';
import { startWatchlistSync } from './domain/watchlists.js';

const PORT = Number(process.env.PORT ?? 4000);
// Loopback-only by default — this API has no TLS and ships hardcoded demo credentials,
// so it shouldn't be reachable from other devices on the network unless explicitly opted in.
const HOST = process.env.HOST ?? '127.0.0.1';

async function main() {
  seedUsersIfEmpty();

  const app = await buildApp({ logger: true });

  const io = createSocketServer(app.server);
  registerHandlers(io);

  startWatchlistSync();
  startMarketDataEngine();
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
