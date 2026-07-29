import { useMemo } from 'react';
import { useMarketStore } from '../../store/useMarketStore.js';
import { byId } from '../../domain/selectors.js';
import { FlashValue } from '../common/FlashValue.js';
import { PnlText } from '../common/PnlText.js';

export function PnlGrid() {
  const desks = useMarketStore((s) => s.desks);
  const commodities = useMarketStore((s) => s.commodities);
  const counterparties = useMarketStore((s) => s.counterparties);
  const positions = useMarketStore((s) => s.positions);

  const desksById = useMemo(() => byId(desks), [desks]);
  const commoditiesById = useMemo(() => byId(commodities), [commodities]);
  const counterpartiesById = useMemo(() => byId(counterparties), [counterparties]);

  const rows = useMemo(
    () => Object.values(positions).sort((a, b) => Math.abs(b.mtmPnl) - Math.abs(a.mtmPnl)),
    [positions],
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-line-hairline">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line-hairline bg-surface-card">
            <th className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-ink-muted">Desk</th>
            <th className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-ink-muted">Commodity</th>
            <th className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-ink-muted">Counterparty</th>
            <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-ink-muted">
              Net Vol
            </th>
            <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-ink-muted">
              Avg Price
            </th>
            <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-ink-muted">
              Market
            </th>
            <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-ink-muted">
              MTM P&L
            </th>
          </tr>
        </thead>
        <tbody className="font-mono tabular-nums">
          {rows.map((p) => (
            <tr key={p.key} className="border-b border-line-hairline last:border-0 hover:bg-surface-card">
              <td className="px-3 py-2 font-sans">{desksById[p.deskId]?.name ?? p.deskId}</td>
              <td className="px-3 py-2 font-sans">{commoditiesById[p.commodityId]?.name ?? p.commodityId}</td>
              <td className="px-3 py-2 font-sans">{counterpartiesById[p.counterpartyId]?.name ?? p.counterpartyId}</td>
              <td className="px-3 py-2 text-right">{p.netVolume.toLocaleString()}</td>
              <td className="px-3 py-2 text-right">{p.avgPrice.toFixed(2)}</td>
              <td className="px-3 py-2 text-right">
                <FlashValue value={p.lastMarketPrice}>{p.lastMarketPrice.toFixed(2)}</FlashValue>
              </td>
              <td className="px-3 py-2 text-right">
                <PnlText value={p.mtmPnl} />
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="px-3 py-8 text-center text-ink-muted">
                Waiting for trades…
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
