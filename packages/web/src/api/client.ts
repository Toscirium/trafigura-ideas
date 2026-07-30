import { useAuthStore } from '../store/useAuthStore.js';

export const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:4000';

function withAuthHeaders(init: RequestInit, token: string | null): RequestInit {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return { ...init, headers };
}

/** fetch() wrapper that attaches the current session's bearer token to every request,
 *  and transparently refreshes + retries once on a 401 (expired access token) before
 *  giving up — callers never need to think about token expiry themselves. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = useAuthStore.getState().token;
  const res = await fetch(`${SERVER_URL}${path}`, withAuthHeaders(init, token));
  if (res.status !== 401) return res;

  const newToken = await useAuthStore.getState().refresh();
  if (!newToken) return res;

  return fetch(`${SERVER_URL}${path}`, withAuthHeaders(init, newToken));
}
