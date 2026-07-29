import type { UserRole } from 'shared';

export const ROUTE_ACCESS: Record<string, UserRole[]> = {
  '/exposure': ['admin', 'trader', 'credit_risk'],
  '/pnl': ['admin', 'trader', 'credit_risk'],
  '/scheduling': ['admin', 'trader'],
  '/reconciliation': ['admin', 'trader', 'settlements'],
  '/counterparties': ['admin', 'trader', 'compliance', 'credit_risk'],
  '/documents': ['admin', 'compliance', 'trader', 'settlements'],
  '/settlement': ['admin', 'settlements', 'credit_risk'],
  '/compliance': ['admin', 'compliance'],
  '/audit': ['admin', 'compliance', 'credit_risk'],
};

export const NAV_LINKS: { to: string; label: string }[] = [
  { to: '/exposure', label: 'Exposure' },
  { to: '/pnl', label: 'P&L' },
  { to: '/scheduling', label: 'Scheduling' },
  { to: '/reconciliation', label: 'Reconciliation' },
  { to: '/counterparties', label: 'Counterparties' },
  { to: '/documents', label: 'Documents' },
  { to: '/settlement', label: 'Settlement' },
  { to: '/compliance', label: 'Compliance' },
  { to: '/audit', label: 'Audit Log' },
];

export function canAccess(role: UserRole, path: string): boolean {
  return ROUTE_ACCESS[path]?.includes(role) ?? false;
}

export function defaultRouteForRole(role: UserRole): string {
  return NAV_LINKS.find((link) => canAccess(role, link.to))?.to ?? '/exposure';
}

export function navLinksForRole(role: UserRole): { to: string; label: string }[] {
  return NAV_LINKS.filter((link) => canAccess(role, link.to));
}
