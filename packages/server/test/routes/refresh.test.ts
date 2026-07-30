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

async function login() {
  const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'admin', password: 'admin123' } });
  return res.json() as { token: string; refreshToken: string; user: unknown };
}

describe('POST /api/auth/refresh', () => {
  it('issues a new access token and rotates the refresh token', async () => {
    const { refreshToken } = await login();

    const res = await app.inject({ method: 'POST', url: '/api/auth/refresh', payload: { refreshToken } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.token).toEqual(expect.any(String));
    expect(body.refreshToken).toEqual(expect.any(String));
    expect(body.refreshToken).not.toBe(refreshToken);
  });

  it('rejects reuse of an already-rotated refresh token', async () => {
    const { refreshToken } = await login();
    await app.inject({ method: 'POST', url: '/api/auth/refresh', payload: { refreshToken } });

    const reuse = await app.inject({ method: 'POST', url: '/api/auth/refresh', payload: { refreshToken } });
    expect(reuse.statusCode).toBe(401);
  });

  it('rejects a garbage refresh token', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/refresh', payload: { refreshToken: 'not-a-real-token' } });
    expect(res.statusCode).toBe(401);
  });

  it('rejects a missing refreshToken body', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/refresh', payload: {} });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /api/auth/logout', () => {
  it('revokes the refresh token so it can no longer be used to refresh', async () => {
    const { refreshToken } = await login();

    const logout = await app.inject({ method: 'POST', url: '/api/auth/logout', payload: { refreshToken } });
    expect(logout.statusCode).toBe(200);

    const refresh = await app.inject({ method: 'POST', url: '/api/auth/refresh', payload: { refreshToken } });
    expect(refresh.statusCode).toBe(401);
  });
});

describe('POST /api/auth/logout-all', () => {
  it('revokes every refresh token for the authenticated user', async () => {
    const first = await login();
    const second = await login();

    const logoutAll = await app.inject({
      method: 'POST',
      url: '/api/auth/logout-all',
      headers: { authorization: `Bearer ${first.token}` },
    });
    expect(logoutAll.statusCode).toBe(200);

    const refreshFirst = await app.inject({ method: 'POST', url: '/api/auth/refresh', payload: { refreshToken: first.refreshToken } });
    const refreshSecond = await app.inject({ method: 'POST', url: '/api/auth/refresh', payload: { refreshToken: second.refreshToken } });
    expect(refreshFirst.statusCode).toBe(401);
    expect(refreshSecond.statusCode).toBe(401);
  });

  it('requires authentication', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/logout-all' });
    expect(res.statusCode).toBe(401);
  });
});
