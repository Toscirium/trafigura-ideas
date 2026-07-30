/** Known origins the bundled frontend actually runs from — Vite dev server plus the
 *  Tauri webview's production origins (differ by platform/webview engine). */
const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://tauri.localhost',
  'https://tauri.localhost',
  'tauri://localhost',
];

export const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : DEFAULT_ORIGINS;

/** Non-browser clients (curl, the desktop sidecar's own health checks) send no Origin
 *  header at all — only browsers attach one for cross-origin requests, so allow those
 *  through and gate on the allowlist otherwise. */
export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  return ALLOWED_ORIGINS.includes(origin);
}
