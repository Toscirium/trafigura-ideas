import type { UserRole } from 'shared';
import { db } from './db.js';

export interface StoredUser {
  id: string;
  username: string;
  passwordHash: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
}

export function countUsers(): number {
  const row = db.prepare('SELECT COUNT(*) as n FROM users').get() as { n: number };
  return row.n;
}

export function getUserByUsername(username: string): StoredUser | undefined {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as StoredUser | undefined;
}

export function getUserById(id: string): StoredUser | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as StoredUser | undefined;
}

export function insertUser(user: StoredUser): void {
  db.prepare(
    'INSERT INTO users (id, username, passwordHash, displayName, role, createdAt) VALUES (@id, @username, @passwordHash, @displayName, @role, @createdAt)',
  ).run(user);
}
