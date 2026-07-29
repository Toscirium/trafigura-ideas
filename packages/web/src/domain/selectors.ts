import type { Commodity, Counterparty, Desk, DeskId, Position, Trade } from 'shared';

export function byId<T extends { id: string }>(items: T[]): Record<string, T> {
  const map: Record<string, T> = {};
  for (const item of items) map[item.id] = item;
  return map;
}

export interface DeskPnl {
  deskId: DeskId;
  name: string;
  pnl: number;
  netVolume: number;
}

export function pnlByDesk(desks: Desk[], positions: Position[]): DeskPnl[] {
  return desks.map((desk) => {
    const deskPositions = positions.filter((p) => p.deskId === desk.id);
    return {
      deskId: desk.id,
      name: desk.name,
      pnl: deskPositions.reduce((sum, p) => sum + p.mtmPnl, 0),
      netVolume: deskPositions.reduce((sum, p) => sum + p.netVolume, 0),
    };
  });
}

export function totalPnl(positions: Position[]): number {
  return positions.reduce((sum, p) => sum + p.mtmPnl, 0);
}

export function tradesForPosition(trades: Trade[], position: Position): Trade[] {
  return trades
    .filter(
      (t) =>
        t.deskId === position.deskId &&
        t.commodityId === position.commodityId &&
        t.counterpartyId === position.counterpartyId,
    )
    .slice()
    .reverse();
}

export function formatCurrency(value: number): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

export function formatVolume(value: number, unit: Commodity['unit']): string {
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 0 })} ${unit}`;
}

export function counterpartyLabel(counterparty: Counterparty | undefined): string {
  return counterparty ? counterparty.name : 'Unknown';
}
