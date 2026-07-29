import type { FastifyInstance } from 'fastify';
import type { AuthUser, LoginInput } from 'shared';
import * as userRepo from '../db/userRepo.js';
import { authenticate } from '../plugins/auth.js';
import { signToken, verifyPassword } from '../domain/auth.js';

function toAuthUser(row: { id: string; username: string; displayName: string; role: AuthUser['role'] }): AuthUser {
  return { id: row.id, username: row.username, displayName: row.displayName, role: row.role };
}

export function registerAuthRoutes(app: FastifyInstance): void {
  app.post<{ Body: LoginInput }>('/api/auth/login', async (req, reply) => {
    const { username, password } = req.body;
    const row = userRepo.getUserByUsername(username);
    if (!row || !verifyPassword(password, row.passwordHash)) {
      reply.code(401);
      return { error: 'Invalid username or password' };
    }
    const user = toAuthUser(row);
    return { token: signToken(user), user };
  });

  app.get('/api/auth/me', { preHandler: authenticate }, async (req) => {
    return { user: req.user };
  });
}
