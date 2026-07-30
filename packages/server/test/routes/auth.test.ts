import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { seedUsersIfEmpty } from '../../src/domain/userSeed.js';

let app: FastifyInstance;

beforeAll(async () => {
  seedUsersIfEmpty();
  app = await buildApp();
});

afterAll(async () => {
  await app.close();
});

describe('POST /api/auth/login', () => {
  it('returns a token + user for correct credentials', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'admin', password: 'admin123' } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.token).toEqual(expect.any(String));
    expect(body.user).toMatchObject({ username: 'admin', role: 'admin' });
  });

  it('rejects an incorrect password', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'admin', password: 'wrong' } });
    expect(res.statusCode).toBe(401);
  });

  it('rejects an unknown username', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'nobody', password: 'x' } });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('rejects a request with no token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' });
    expect(res.statusCode).toBe(401);
  });

  it('returns the current user for a valid token', async () => {
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'trader', password: 'trader123' } });
    const { token } = login.json();

    const res = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    expect(res.json().user).toMatchObject({ username: 'trader', role: 'trader' });
  });
});

describe('role-gated routes', () => {
  it('rejects a non-admin from an admin-only route', async () => {
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'trader', password: 'trader123' } });
    const { token } = login.json();

    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/counterparties/import',
      headers: { authorization: `Bearer ${token}` },
      payload: { counterparties: [] },
    });
    expect(res.statusCode).toBe(403);
  });

  it('rejects an unauthenticated request from an admin-only route', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/admin/counterparties/import', payload: { counterparties: [] } });
    expect(res.statusCode).toBe(401);
  });
});
