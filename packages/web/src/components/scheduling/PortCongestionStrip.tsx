import clsx from 'clsx';
import type { Port, PortCongestion } from 'shared';

export function PortCongestionStrip({
  ports,
  portCongestion,
}: {
  ports: Port[];
  portCongestion: Record<string, PortCongestion>;
}) {
  return (
    <div className="flex items-center gap-5 overflow-x-auto rounded-lg border border-line-hairline bg-surface-card px-4 py-2.5 text-xs">
      <span className="shrink-0 font-medium uppercase tracking-wide text-ink-muted">Port congestion</span>
      {ports.map((port) => {
        const c = portCongestion[port.id];
        if (!c) return null;
        const busy = c.vesselsWaiting >= 8;
        return (
          <div key={port.id} className="flex shrink-0 items-baseline gap-1.5 font-mono tabular-nums">
            <span className="font-sans text-ink-secondary">{port.name}</span>
            <span className={clsx('font-semibold', busy ? 'text-status-loss' : 'text-ink-primary')}>
              {c.vesselsWaiting}
            </span>
            <span className="text-ink-muted">waiting · {c.avgWaitHours.toFixed(0)}h avg</span>
          </div>
        );
      })}
    </div>
  );
}
