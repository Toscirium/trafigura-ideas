import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { AuthUser } from 'shared';

const SALT_ROUNDS = 10;
const TOKEN_TTL = '12h';

/**
 * Generated fresh on every server start when JWT_SECRET isn't set — fine for
 * this single-instance demo (restarting the server invalidates sessions),
 * but a real deployment should pin JWT_SECRET so tokens survive a restart.
 */
const JWT_SECRET = process.env.JWT_SECRET ?? cryptoRandomSecret();

function cryptoRandomSecret(): string {
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function signToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}
