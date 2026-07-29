import { useMarketStore } from '../../store/useMarketStore.js';

export function ConnectionBadge() {
  const connected = useMarketStore((s) => s.connected);

  return (
    <div className="flex items-center gap-2 text-xs text-ink-secondary">
      <span
        className={`h-2 w-2 rounded-full ${connected ? 'bg-status-gain' : 'bg-status-loss'}`}
        aria-hidden
      />
      <span>{connected ? 'Live' : 'Reconnecting…'}</span>
    </div>
  );
}
