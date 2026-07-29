const DAY_MS = 24 * 60 * 60 * 1000;

export const PX_PER_DAY = 44;

// Fixed once per page load so the ruler doesn't jitter as real time passes during the session.
export const TIMELINE_START_MS = Date.now() - 7 * DAY_MS;
export const TIMELINE_DAYS = 42;
export const TIMELINE_WIDTH_PX = TIMELINE_DAYS * PX_PER_DAY;

export function dateToX(iso: string): number {
  return ((Date.parse(iso) - TIMELINE_START_MS) / DAY_MS) * PX_PER_DAY;
}

export function msToPx(ms: number): number {
  return (ms / DAY_MS) * PX_PER_DAY;
}

/** Snaps a pixel delta to the nearest quarter-day, in ms. */
export function snapPxToMs(deltaPx: number): number {
  const days = Math.round((deltaPx / PX_PER_DAY) * 4) / 4;
  return days * DAY_MS;
}

export function formatDayLabel(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatHours(hours: number): string {
  const days = Math.floor(hours / 24);
  const rem = Math.round(hours % 24);
  if (days === 0) return `${rem}h`;
  return `${days}d ${rem}h`;
}
