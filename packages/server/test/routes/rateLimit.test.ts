import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { seedUsersIfEmpty } from '../../src/domain/userSeed.js';

// Own app instance so this test's rapid-fire requests don't eat into other test files'
// login budget — @fastify/rate-limit buckets by client IP, which `.inject()` fixes to a
// constant address, so every request against one app instance shares one bucket.
let app: FastifyInstance;

beforeAll(async () => {
  seedUsersIfEmpty();
  app = await buildApp();
});

afterAll(async () => {
  await app.close();
});

describe('login rate limiting', () => {
  it('blocks further attempts after the per-minute cap', async () => {
    const attempt = () => app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'admin', password: 'wrong' } });

    const statuses: number[] = [];
    for (let i = 0; i < 10; i++) {
      const res = await attempt();
      statuses.push(res.statusCode);
    }

    expect(statuses.slice(0, 8).every((s) => s === 401)).toBe(true);
    expect(statuses.slice(8)).toEqual([429, 429]);
  });
});
