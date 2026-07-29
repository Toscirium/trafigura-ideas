import { nanoid } from 'nanoid';
import { DESKS, commoditiesForDesk } from 'shared';
import type { ConfirmationChannel, ConfirmationExtracted, Trade, TradeConfirmation } from 'shared';
import { store } from '../state/store.js';
import { counterpartyStore } from '../state/counterpartyStore.js';
import { reconciliationStore } from '../state/reconciliationStore.js';
import { matchConfirmation } from '../domain/reconciliation.js';
import { formatRawConfirmation } from '../domain/confirmationText.js';
import { alertCriticalBreak } from './alertEngine.js';
import { clock } from './clock.js';

const TICK_MS = 2500;
/** Fraction of still-unconfirmed trades that get a confirmation on any given tick — leaves a realistic backlog. */
const CONFIRM_PROBABILITY = 0.6;
const ORPHAN_PROBABILITY = 0.12;

const CHANNELS: ConfirmationChannel[] = ['email', 'edi', 'swift'];
const confirmedTradeIds = new Set<string>();

type Scenario = 'clean' | 'price' | 'volume' | 'counterparty';

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function weightedScenario(): Scenario {
  const r = Math.random();
  if (r < 0.62) return 'clean';
  if (r < 0.74) return 'price';
  if (r < 0.86) return 'volume';
  return 'counterparty';
}

function perturbedExtractedFromTrade(trade: Trade, scenario: Scenario): ConfirmationExtracted {
  const base: ConfirmationExtracted = {
    deskId: trade.deskId,
    commodityId: trade.commodityId,
    counterpartyId: trade.counterpartyId,
    side: trade.side,
    volume: trade.volume,
    price: trade.price,
    tradeDate: trade.timestamp,
  };

  switch (scenario) {
    case 'price': {
      const pct = 0.002 + Math.random() * 0.028;
      const sign = Math.random() < 0.5 ? -1 : 1;
      return { ...base, price: Math.max(0.01, trade.price * (1 + sign * pct)) };
    }
    case 'volume': {
      const pct = 0.01 + Math.random() * 0.07;
      const sign = Math.random() < 0.5 ? -1 : 1;
      return { ...base, volume: Math.max(1, Math.round(trade.volume * (1 + sign * pct))) };
    }
    case 'counterparty': {
      const others = counterpartyStore.list().filter((c) => c.id !== trade.counterpartyId);
      return { ...base, counterpartyId: pick(others).id };
    }
    default:
      return base;
  }
}

function buildConfirmation(extracted: ConfirmationExtracted, receivedAtMs: number): TradeConfirmation {
  const channel = pick(CHANNELS);
  const ref = nanoid(8).toUpperCase();
  const match = matchConfirmation(extracted, store.trades, receivedAtMs);

  return {
    id: nanoid(10),
    channel,
    receivedAt: new Date(receivedAtMs).toISOString(),
    rawText: formatRawConfirmation(channel, extracted, ref),
    extracted,
    matchedTradeId: match.matchedTradeId,
    status: match.status,
    breaks: match.breaks,
    resolved: false,
    resolutionNote: null,
    resolvedAt: null,
  };
}

function generateOrphan(receivedAtMs: number): TradeConfirmation {
  const desk = pick(DESKS);
  const commodity = pick(commoditiesForDesk(desk.id));
  const counterparty = pick(counterpartyStore.list());
  const side = Math.random() < 0.5 ? 'BUY' : 'SELL';
  const baseVolume = commodity.unit === 'MMBtu' ? 50_000 : commodity.unit === 'bbl' ? 20_000 : 500;

  const extracted: ConfirmationExtracted = {
    deskId: desk.id,
    commodityId: commodity.id,
    counterpartyId: counterparty.id,
    side,
    volume: Math.round(baseVolume * (0.5 + Math.random())),
    price: commodity.basePrice * (0.95 + Math.random() * 0.1),
    tradeDate: new Date(receivedAtMs).toISOString(),
  };

  return buildConfirmation(extracted, receivedAtMs);
}

function tick(): void {
  if (!clock.running) return;
  const now = Date.now();

  if (Math.random() < ORPHAN_PROBABILITY) {
    const orphan = generateOrphan(now);
    reconciliationStore.addConfirmation(orphan);
    alertCriticalBreak(orphan);
    return;
  }

  const eligible = store.trades.filter((t) => !confirmedTradeIds.has(t.id));
  if (eligible.length === 0 || Math.random() > CONFIRM_PROBABILITY) return;

  const trade = pick(eligible);
  confirmedTradeIds.add(trade.id);

  const extracted = perturbedExtractedFromTrade(trade, weightedScenario());
  const confirmation = buildConfirmation(extracted, now);
  reconciliationStore.addConfirmation(confirmation);
  alertCriticalBreak(confirmation);

  if (confirmedTradeIds.size > 500) {
    const live = new Set(store.trades.map((t) => t.id));
    for (const id of confirmedTradeIds) {
      if (!live.has(id)) confirmedTradeIds.delete(id);
    }
  }
}

export function startConfirmationEngine(): void {
  setInterval(() => tick(), clock.scaledInterval(TICK_MS));
}
