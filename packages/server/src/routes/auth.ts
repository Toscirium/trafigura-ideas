import type { FastifyInstance } from 'fastify';
import type { AuthUser, LoginInput, RefreshInput } from 'shared';
import * as userRepo from '../db/userRepo.js';
import { authenticate } from '../plugins/auth.js';
import {
  signToken,
  verifyPassword,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
} from '../domain/auth.js';

function toAuthUser(row: { id: string; username: string; displayName: string; role: AuthUser['role'] }): AuthUser {
  return { id: row.id, username: row.username, displayName: row.displayName, role: row.role };
}

export function registerAuthRoutes(app: FastifyInstance): void {
  app.post<{ Body: LoginInput }>(
    '/api/auth/login',
    { config: { rateLimit: { max: 8, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const { username, password } = req.body;
      const row = userRepo.getUserByUsername(username);
      if (!row || !verifyPassword(password, row.passwordHash)) {
        reply.code(401);
        return { error: 'Invalid username or password' };
      }
      const user = toAuthUser(row);
      const { token: refreshToken } = issueRefreshToken(user.id);
      return { token: signToken(user), refreshToken, user };
    },
  );

  app.post<{ Body: RefreshInput }>(
    '/api/auth/refresh',
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const { refreshToken } = req.body ?? {};
      if (!refreshToken) {
        reply.code(400);
        return { error: 'Missing refreshToken' };
      }

      const rotated = rotateRefreshToken(refreshToken);
      if (!rotated) {
        reply.code(401);
        return { error: 'Refresh token is invalid, expired, or already used' };
      }

      const row = userRepo.getUserById(rotated.userId);
      if (!row) {
        reply.code(401);
        return { error: 'Refresh token is invalid, expired, or already used' };
      }

      const user = toAuthUser(row);
      return { token: signToken(user), refreshToken: rotated.token, user };
    },
  );

  app.post<{ Body: { refreshToken?: string } }>('/api/auth/logout', async (req) => {
    if (req.body?.refreshToken) revokeRefreshToken(req.body.refreshToken);
    return { ok: true };
  });

  app.post('/api/auth/logout-all', { preHandler: authenticate }, async (req) => {
    revokeAllRefreshTokensForUser(req.user!.id);
    return { ok: true };
  });

  app.get('/api/auth/me', { preHandler: authenticate }, async (req) => {
    return { user: req.user };
  });
}
