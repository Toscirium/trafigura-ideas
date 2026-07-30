import { db } from './db.js';

export interface StoredRefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

export function insertRefreshToken(row: StoredRefreshToken): void {
  db.prepare(
    'INSERT INTO refresh_tokens (id, userId, tokenHash, createdAt, expiresAt, revokedAt) VALUES (@id, @userId, @tokenHash, @createdAt, @expiresAt, @revokedAt)',
  ).run(row);
}

export function getRefreshTokenByHash(tokenHash: string): StoredRefreshToken | undefined {
  return db.prepare('SELECT * FROM refresh_tokens WHERE tokenHash = ?').get(tokenHash) as StoredRefreshToken | undefined;
}

export function revokeRefreshToken(id: string, revokedAt: string): void {
  db.prepare('UPDATE refresh_tokens SET revokedAt = @revokedAt WHERE id = @id').run({ id, revokedAt });
}

export function revokeAllRefreshTokensForUser(userId: string, revokedAt: string): void {
  db.prepare('UPDATE refresh_tokens SET revokedAt = @revokedAt WHERE userId = @userId AND revokedAt IS NULL').run({ userId, revokedAt });
}

/** Best-effort housekeeping — deletes tokens that expired more than a day ago, called
 *  opportunistically on refresh rather than on a timer (this table only ever grows by one
 *  row per login/refresh, so it doesn't need a dedicated cleanup job for a demo's scale). */
export function pruneExpiredRefreshTokens(now: string): void {
  db.prepare('DELETE FROM refresh_tokens WHERE expiresAt < @now').run({ now });
}
