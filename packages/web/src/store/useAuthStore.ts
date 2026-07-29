import { create } from 'zustand';
import type { AuthUser, LoginResult } from 'shared';

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:4000';
const STORAGE_KEY = 'vantage-risk-auth';

interface StoredAuth {
  token: string;
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

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  error: string | null;
  submitting: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const stored = loadStored();

export const useAuthStore = create<AuthState>((set) => ({
  token: stored?.token ?? null,
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
      set({ token: result.token, user: result.user, submitting: false, error: null });
      return true;
    } catch {
      set({ error: 'Could not reach the server', submitting: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ token: null, user: null });
  },
}));
