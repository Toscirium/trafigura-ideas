import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AuthUser, UserRole } from 'shared';
import { verifyToken } from '../domain/auth.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export async function authenticate(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  const user = token ? verifyToken(token) : null;
  if (!user) {
    reply.code(401);
    throw new Error('Unauthorized');
  }
  req.user = user;
}

export function requireRole(...roles: UserRole[]) {
  return async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!req.user || !roles.includes(req.user.role)) {
      reply.code(403);
      throw new Error('Forbidden');
    }
  };
}
