import { describe, expect, it } from 'vitest';
import type { UserRole } from 'shared';
import { canAccess, defaultRouteForRole, navLinksForRole, ROUTE_ACCESS } from '../../src/domain/access.js';

const ALL_ROLES: UserRole[] = ['admin', 'trader', 'compliance', 'settlements', 'credit_risk'];

describe('canAccess', () => {
  it('grants admin access to every route', () => {
    for (const path of Object.keys(ROUTE_ACCESS)) {
      expect(canAccess('admin', path)).toBe(true);
    }
  });

  it('denies trader access to compliance-only routes', () => {
    expect(canAccess('trader', '/compliance')).toBe(false);
    expect(canAccess('trader', '/audit')).toBe(false);
  });

  it('denies compliance access to trader-only scheduling', () => {
    expect(canAccess('compliance', '/scheduling')).toBe(false);
  });

  it('returns false for an unknown route', () => {
    expect(canAccess('admin', '/not-a-real-route')).toBe(false);
  });
});

describe('navLinksForRole', () => {
  it('never returns a link the role cannot access', () => {
    for (const role of ALL_ROLES) {
      const links = navLinksForRole(role);
      for (const link of links) {
        expect(canAccess(role, link.to)).toBe(true);
      }
    }
  });

  it('excludes compliance and audit for a trader', () => {
    const links = navLinksForRole('trader').map((l) => l.to);
    expect(links).not.toContain('/compliance');
    expect(links).not.toContain('/audit');
  });
});

describe('defaultRouteForRole', () => {
  it('returns a route the role can actually access, for every role', () => {
    for (const role of ALL_ROLES) {
      const route = defaultRouteForRole(role);
      expect(canAccess(role, route)).toBe(true);
    }
  });
});
