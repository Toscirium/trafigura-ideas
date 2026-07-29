import { useEffect, useMemo, useState } from 'react';
import type { PnlHistoryPayload, PnlSnapshotPoint } from 'shared';
import { apiFetch } from '../../api/client.js';
import { formatCurrency } from '../../domain/selectors.js';

const WIDTH = 800;
const HEIGHT = 120;
const PADDING = 12;

export function HistoricalPnlChart() {
  const [points, setPoints] = useState<PnlSnapshotPoint[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiFetch('/api/pnl/history')
      .then((res) => res.json())
      .then((body: PnlHistoryPayload) => {
        if (!cancelled) setPoints(body.points);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const series = useMemo(() => {
    const byTime = new Map<string, number>();
    for (const p of points) byTime.set(p.takenAt, (byTime.get(p.takenAt) ?? 0) + p.pnlUsd);
    return Array.from(byTime.entries())
      .sort(([a], [b]) => Date.parse(a) - Date.parse(b))
      .map(([takenAt, pnl]) => ({ takenAt, pnl }));
  }, [points]);

  if (series.length < 2) {
    return (
      <div className="rounded-lg border border-line-hairline bg-surface-card p-4 text-xs text-ink-muted">
        Historical P&amp;L (persisted, survives restarts) — not enough data yet. Snapshots are recorded every 30
        seconds.
      </div>
    );
  }

  const values = series.map((s) => s.pnl);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;
  const innerW = WIDTH - PADDING * 2;
  const innerH = HEIGHT - PADDING * 2;
  const stepX = innerW / (series.length - 1);
  const toY = (v: number) => PADDING + innerH - ((v - min) / range) * innerH;
  const zeroY = toY(0);

  const linePath = series
    .map((s, i) => `${i === 0 ? 'M' : 'L'}${(PADDING + i * stepX).toFixed(1)},${toY(s.pnl).toFixed(1)}`)
    .join(' ');

  const latest = series[series.length - 1]!.pnl;
  const color = latest >= 0 ? '#0ca30c' : '#d03b3b';

  return (
    <div className="rounded-lg border border-line-hairline bg-surface-card p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-secondary">
          Historical P&amp;L ({series.length} snapshots, persisted)
        </span>
        <span className="font-mono text-sm font-semibold" style={{ color }}>
          {formatCurrency(latest)}
        </span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" preserveAspectRatio="none" aria-hidden>
        <line x1={PADDING} y1={zeroY} x2={WIDTH - PADDING} y2={zeroY} stroke="#383835" strokeWidth={1} />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
