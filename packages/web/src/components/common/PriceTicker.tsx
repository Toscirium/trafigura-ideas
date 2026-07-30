import clsx from 'clsx';
import { LIVE_PRICE_COMMODITY_IDS } from 'shared';
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
        const isLive = LIVE_PRICE_COMMODITY_IDS.includes(commodity.id);

        return (
          <div key={commodity.id} className="flex shrink-0 items-baseline gap-1.5 font-mono tabular-nums">
            {isLive && (
              <span
                className="h-1.5 w-1.5 rounded-full bg-brand"
                title="Real market data (Massive API)"
                aria-label="Live market data"
              />
            )}
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
