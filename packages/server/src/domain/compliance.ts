import { VESSELS } from 'shared';
import type { CasePriority, ComplianceCase, ScreeningEntityType, Trade, Voyage } from 'shared';
import { counterpartyStore } from '../state/counterpartyStore.js';
import { currentWatchlist } from './watchlists.js';

export const COMPLIANCE_OFFICERS = ['Priya Nair', 'Daniel Osei', 'Helena Kruger', 'Ben Whitmore'];

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function priorityForScore(score: number): CasePriority {
  if (score >= 85) return 'high';
  if (score >= 70) return 'medium';
  return 'low';
}

export interface ScreeningHitInput {
  entityType: ScreeningEntityType;
  entityId: string;
  entityName: string;
  relatedTradeId: string | null;
  relatedVoyageId: string | null;
}

/**
 * Simulates a screening engine throwing a fuzzy-match hit between one of our real
 * counterparties/vessels and a name on a watchlist. The match score is deliberately
 * imperfect — a real screening vendor throws plenty of false positives; the point of
 * this module is the case-management workflow that triages them, not match accuracy.
 */
export function buildScreeningHit(
  entityType: ScreeningEntityType,
  trades: readonly Trade[],
  voyages: readonly Voyage[],
): Pick<ComplianceCase, 'entityType' | 'entityId' | 'entityName' | 'listType' | 'matchedName' | 'matchScore' | 'priority' | 'relatedTradeId' | 'relatedVoyageId'> {
  const watch = pick(currentWatchlist());
  const matchScore = Math.round(55 + Math.random() * 40);
  const priority = priorityForScore(matchScore);

  if (entityType === 'counterparty') {
    const counterparty = pick(counterpartyStore.list());
    const relatedTrade = [...trades].reverse().find((t) => t.counterpartyId === counterparty.id) ?? null;
    return {
      entityType,
      entityId: counterparty.id,
      entityName: counterparty.name,
      listType: watch.list,
      matchedName: watch.name,
      matchScore,
      priority,
      relatedTradeId: relatedTrade?.id ?? null,
      relatedVoyageId: null,
    };
  }

  const vessel = pick(VESSELS);
  const relatedVoyage = voyages.find((v) => v.vesselId === vessel.id) ?? null;
  return {
    entityType,
    entityId: vessel.id,
    entityName: vessel.name,
    listType: watch.list,
    matchedName: watch.name,
    matchScore,
    priority,
    relatedTradeId: null,
    relatedVoyageId: relatedVoyage?.id ?? null,
  };
}
