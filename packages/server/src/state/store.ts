import { EventEmitter } from 'node:events';
import { COMMODITIES, DESKS } from 'shared';
import type { MarketPriceTick, Position, SnapshotPayload, Trade } from 'shared';
import { counterpartyStore } from './counterpartyStore.js';

const TRADE_BUFFER_SIZE = 200;

class Store extends EventEmitter {
  readonly trades: Trade[] = [];
  readonly positions = new Map<string, Position>();
  readonly prices = new Map<string, MarketPriceTick>();

  addTrade(trade: Trade): void {
    this.trades.push(trade);
    if (this.trades.length > TRADE_BUFFER_SIZE) {
      this.trades.shift();
    }
    this.emit('trade', trade);
  }

  updatePrice(tick: MarketPriceTick): void {
    this.prices.set(tick.commodityId, tick);
    this.emit('priceTick', tick);
  }

  upsertPosition(position: Position): void {
    this.positions.set(position.key, position);
    this.emit('positionUpdate', position);
  }

  tradesForPosition(positionKey: string): Trade[] {
    const position = this.positions.get(positionKey);
    if (!position) return [];
    return this.trades.filter(
      (t) =>
        t.deskId === position.deskId &&
        t.commodityId === position.commodityId &&
        t.counterpartyId === position.counterpartyId,
    );
  }

  snapshot(): SnapshotPayload {
    return {
      desks: DESKS,
      commodities: COMMODITIES,
      counterparties: counterpartyStore.list(),
      positions: Array.from(this.positions.values()),
      prices: Array.from(this.prices.values()),
    };
  }
}

export const store = new Store();
