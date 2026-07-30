import { randomBytes, createHash } from 'node:crypto';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { AuthUser } from 'shared';
import {
  insertRefreshToken,
  getRefreshTokenByHash,
  revokeRefreshToken as revokeRefreshTokenRow,
  revokeAllRefreshTokensForUser as revokeAllRefreshTokenRowsForUser,
  pruneExpiredRefreshTokens,
} from '../db/refreshTokenRepo.js';

const SALT_ROUNDS = 10;

// Short-lived access token + long-lived, server-revocable refresh token — a leaked access
// token is only useful for 15 minutes, and a stolen refresh token can be revoked (logout,
// or "log out everywhere") instead of just expiring on its own many hours later.
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Generated fresh on every server start when JWT_SECRET isn't set — fine for
 * this single-instance demo (restarting the server invalidates sessions),
 * but a real deployment should pin JWT_SECRET so tokens survive a restart.
 */
const JWT_SECRET = process.env.JWT_SECRET ?? randomBytes(32).toString('hex');

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function signToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

/** Refresh tokens are high-entropy random strings, not JWTs — they're validated by DB
 *  lookup (so they can be revoked), not by signature, so there's no need for JWT's
 *  self-contained-claims complexity here. Stored hashed, like a password, so a leaked
 *  database dump doesn't hand out live sessions. */
function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface IssuedRefreshToken {
  token: string;
  expiresAt: string;
}

export function issueRefreshToken(userId: string): IssuedRefreshToken {
  const token = randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS).toISOString();
  insertRefreshToken({
    id: nanoid(10),
    userId,
    tokenHash: hashRefreshToken(token),
    createdAt: now.toISOString(),
    expiresAt,
    revokedAt: null,
  });
  return { token, expiresAt };
}

/** Verifies a refresh token is known, unrevoked, and unexpired; returns the owning
 *  userId. Also rotates it — the presented token is revoked and a new one issued — so a
 *  refresh token is single-use, limiting how long a stolen one stays valid. */
export function rotateRefreshToken(token: string): (IssuedRefreshToken & { userId: string }) | null {
  const row = getRefreshTokenByHash(hashRefreshToken(token));
  const now = new Date();
  pruneExpiredRefreshTokens(now.toISOString());

  if (!row || row.revokedAt || Date.parse(row.expiresAt) < now.getTime()) return null;

  revokeRefreshTokenRow(row.id, now.toISOString());
  const next = issueRefreshToken(row.userId);
  return { ...next, userId: row.userId };
}

export function revokeRefreshToken(token: string): void {
  const row = getRefreshTokenByHash(hashRefreshToken(token));
  if (row && !row.revokedAt) revokeRefreshTokenRow(row.id, new Date().toISOString());
}

export function revokeAllRefreshTokensForUser(userId: string): void {
  revokeAllRefreshTokenRowsForUser(userId, new Date().toISOString());
}
