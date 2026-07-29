import clsx from 'clsx';

export function UtilizationBar({ pct }: { pct: number }) {
  const clamped = Math.min(1.25, Math.max(0, pct));
  const color = pct >= 1 ? 'bg-status-loss' : pct >= 0.8 ? 'bg-desk-lng' : 'bg-status-gain';

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-line-hairline">
        <div className={clsx('h-full rounded-full', color)} style={{ width: `${Math.min(100, clamped * 100)}%` }} />
      </div>
      <span
        className={clsx(
          'font-mono text-xs tabular-nums',
          pct >= 1 ? 'text-status-loss' : pct >= 0.8 ? 'text-desk-lng' : 'text-ink-secondary',
        )}
      >
        {(pct * 100).toFixed(0)}%
      </span>
    </div>
  );
}
