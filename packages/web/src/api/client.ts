import { useAuthStore } from '../store/useAuthStore.js';

export const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:4000';

/** fetch() wrapper that attaches the current session's bearer token to every request. */
export function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = useAuthStore.getState().token;
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return fetch(`${SERVER_URL}${path}`, { ...init, headers });
}
