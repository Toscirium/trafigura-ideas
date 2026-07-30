import { describe, expect, it, vi } from 'vitest';
import { isOriginAllowed } from '../../src/security/corsOrigins.js';

describe('isOriginAllowed', () => {
  it('allows requests with no Origin header (non-browser clients)', () => {
    expect(isOriginAllowed(undefined)).toBe(true);
  });

  it('allows the Vite dev origin', () => {
    expect(isOriginAllowed('http://localhost:5173')).toBe(true);
  });

  it('allows known Tauri production origins', () => {
    expect(isOriginAllowed('tauri://localhost')).toBe(true);
    expect(isOriginAllowed('http://tauri.localhost')).toBe(true);
  });

  it('rejects an arbitrary external origin', () => {
    expect(isOriginAllowed('https://evil.example.com')).toBe(false);
  });

  it('respects CORS_ORIGINS overrides', async () => {
    const original = process.env.CORS_ORIGINS;
    process.env.CORS_ORIGINS = 'https://custom.example.com';
    vi.resetModules();
    const { isOriginAllowed: reloaded } = await import('../../src/security/corsOrigins.js');
    expect(reloaded('https://custom.example.com')).toBe(true);
    expect(reloaded('http://localhost:5173')).toBe(false);
    process.env.CORS_ORIGINS = original;
    vi.resetModules();
  });
});
