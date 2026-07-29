import { nanoid } from 'nanoid';
import type { UserRole } from 'shared';
import * as userRepo from '../db/userRepo.js';
import { hashPassword } from './auth.js';

/** Demo credentials — printed to the server log on first boot so they're discoverable without digging through source. */
const DEMO_USERS: { username: string; password: string; displayName: string; role: UserRole }[] = [
  { username: 'admin', password: 'admin123', displayName: 'Admin User', role: 'admin' },
  { username: 'trader', password: 'trader123', displayName: 'Sarah Chen', role: 'trader' },
  { username: 'compliance', password: 'compliance123', displayName: 'Priya Nair', role: 'compliance' },
  { username: 'settlements', password: 'settlements123', displayName: 'Tom Whitfield', role: 'settlements' },
  { username: 'riskmgr', password: 'risk123', displayName: 'Aisha Rahman', role: 'credit_risk' },
];

export function seedUsersIfEmpty(): void {
  if (userRepo.countUsers() > 0) return;

  const now = new Date().toISOString();
  for (const u of DEMO_USERS) {
    userRepo.insertUser({
      id: nanoid(10),
      username: u.username,
      passwordHash: hashPassword(u.password),
      displayName: u.displayName,
      role: u.role,
      createdAt: now,
    });
  }

  console.log('[auth] Seeded demo users (username / password / role):');
  for (const u of DEMO_USERS) {
    console.log(`  ${u.username} / ${u.password} / ${u.role}`);
  }
}
