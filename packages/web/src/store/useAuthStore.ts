import { create } from 'zustand';
import type { AuthUser, LoginResult, RefreshResult } from 'shared';

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:4000';
const STORAGE_KEY = 'meridian-auth';

interface StoredAuth {
  token: string;
  refreshToken: string;
  user: AuthUser;
}

function loadStored(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

function persist(auth: StoredAuth): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  error: string | null;
  submitting: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  /** Exchanges the stored refresh token for a new access token. Used by apiFetch when a
   *  request comes back 401 (access token expired) — returns the new access token on
   *  success, or null if the refresh token itself is invalid/expired/revoked (forces the
   *  caller back to the login screen). Concurrent callers share one in-flight refresh. */
  refresh: () => Promise<string | null>;
}

const stored = loadStored();
let inFlightRefresh: Promise<string | null> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  token: stored?.token ?? null,
  refreshToken: stored?.refreshToken ?? null,
  user: stored?.user ?? null,
  error: null,
  submitting: false,

  login: async (username, password) => {
    set({ submitting: true, error: null });
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        set({ error: body.error ?? 'Login failed', submitting: false });
        return false;
      }
      const result = (await res.json()) as LoginResult;
      persist(result);
      set({ token: result.token, refreshToken: result.refreshToken, user: result.user, submitting: false, error: null });
      return true;
    } catch {
      set({ error: 'Could not reach the server', submitting: false });
      return false;
    }
  },

  logout: () => {
    const refreshToken = get().refreshToken;
    if (refreshToken) {
      // Best-effort — the local session is cleared either way, so a network hiccup here
      // shouldn't block logout, just leave that one refresh token to expire on its own.
      fetch(`${SERVER_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
    localStorage.removeItem(STORAGE_KEY);
    set({ token: null, refreshToken: null, user: null });
  },

  refresh: async () => {
    if (inFlightRefresh) return inFlightRefresh;

    const refreshToken = get().refreshToken;
    if (!refreshToken) return null;

    inFlightRefresh = (async () => {
      try {
        const res = await fetch(`${SERVER_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) {
          localStorage.removeItem(STORAGE_KEY);
          set({ token: null, refreshToken: null, user: null });
          return null;
        }
        const result = (await res.json()) as RefreshResult;
        persist(result);
        set({ token: result.token, refreshToken: result.refreshToken, user: result.user });
        return result.token;
      } catch {
        return null;
      } finally {
        inFlightRefresh = null;
      }
    })();

    return inFlightRefresh;
  },
}));
