import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword, signToken, verifyToken } from '../../src/domain/auth.js';
import type { AuthUser } from 'shared';

const USER: AuthUser = { id: 'u1', username: 'trader', displayName: 'Trader One', role: 'trader' };

describe('password hashing', () => {
  it('verifies a correct password against its hash', () => {
    const hash = hashPassword('correct-horse-battery-staple');
    expect(verifyPassword('correct-horse-battery-staple', hash)).toBe(true);
  });

  it('rejects an incorrect password', () => {
    const hash = hashPassword('correct-horse-battery-staple');
    expect(verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('never stores the password in plaintext', () => {
    const hash = hashPassword('secret123');
    expect(hash).not.toContain('secret123');
  });
});

describe('JWT tokens', () => {
  it('round-trips a signed token back to the same user', () => {
    const token = signToken(USER);
    const decoded = verifyToken(token);
    expect(decoded).toMatchObject(USER);
  });

  it('rejects a tampered token', () => {
    const token = signToken(USER);
    const tampered = token.slice(0, -2) + (token.at(-2) === 'a' ? 'b' : 'a') + token.at(-1);
    expect(verifyToken(tampered)).toBeNull();
  });

  it('rejects garbage input instead of throwing', () => {
    expect(verifyToken('not-a-real-token')).toBeNull();
  });
});
