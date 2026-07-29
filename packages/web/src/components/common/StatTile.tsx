import clsx from 'clsx';
import { Sparkline } from './Sparkline.js';

interface StatTileProps {
  label: string;
  value: string;
  delta: number;
  deltaLabel: string;
  sparklineData: number[];
  accentClassName?: string;
}

export function StatTile({ label, value, delta, deltaLabel, sparklineData, accentClassName }: StatTileProps) {
  const status: 'gain' | 'loss' | 'neutral' = delta > 0 ? 'gain' : delta < 0 ? 'loss' : 'neutral';

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line-hairline bg-surface-card p-4 shadow-card transition-colors hover:border-line-baseline">
      <div className="flex items-center gap-2">
        <span className={clsx('h-2 w-2 rounded-full', accentClassName)} aria-hidden />
        <span className="text-xs font-medium uppercase tracking-wide text-ink-secondary">{label}</span>
      </div>
      <div className="font-mono text-2xl font-semibold tabular-nums text-ink-primary">{value}</div>
      <div className="flex items-center justify-between">
        <span
          className={clsx(
            'flex items-center gap-1 text-xs font-medium',
            status === 'gain' && 'text-status-gain',
            status === 'loss' && 'text-status-loss',
            status === 'neutral' && 'text-ink-muted',
          )}
        >
          <span aria-hidden>{status === 'gain' ? '▲' : status === 'loss' ? '▼' : '·'}</span>
          {deltaLabel}
        </span>
        <Sparkline data={sparklineData} status={status} />
      </div>
    </div>
  );
}
