import clsx from 'clsx';
import { useMarketStore } from '../../store/useMarketStore.js';

export function PriceTicker() {
  const commodities = useMarketStore((s) => s.commodities);
  const prices = useMarketStore((s) => s.prices);

  return (
    <div className="flex items-center gap-6 overflow-x-auto text-xs" aria-label="Live commodity prices">
      {commodities.map((commodity) => {
        const tick = prices[commodity.id];
        if (!tick) return null;
        const status = tick.changePct > 0 ? 'gain' : tick.changePct < 0 ? 'loss' : 'neutral';

        return (
          <div key={commodity.id} className="flex shrink-0 items-baseline gap-2 font-mono tabular-nums">
            <span className="text-ink-secondary">{commodity.id}</span>
            <span className="text-ink-primary">{tick.price.toFixed(2)}</span>
            <span
              className={clsx(
                'flex items-center gap-0.5',
                status === 'gain' && 'text-status-gain',
                status === 'loss' && 'text-status-loss',
                status === 'neutral' && 'text-ink-muted',
              )}
            >
              <span aria-hidden>{status === 'gain' ? '▲' : status === 'loss' ? '▼' : '·'}</span>
              {Math.abs(tick.changePct * 100).toFixed(2)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
