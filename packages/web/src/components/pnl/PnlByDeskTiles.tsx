import { useMarketStore } from '../../store/useMarketStore.js';
import { formatCurrency, pnlByDesk } from '../../domain/selectors.js';
import { useSeries } from '../../domain/useSeries.js';
import { StatTile } from '../common/StatTile.js';

const DESK_ACCENT: Record<string, string> = {
  crude: 'bg-desk-crude',
  'fuel-oil': 'bg-desk-fuel-oil',
  metals: 'bg-desk-metals',
  lng: 'bg-desk-lng',
};

export function PnlByDeskTiles() {
  const desks = useMarketStore((s) => s.desks);
  const positions = useMarketStore((s) => s.positions);

  const deskPnls = pnlByDesk(desks, Object.values(positions));

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {deskPnls.map((d) => (
        <DeskTile key={d.deskId} deskId={d.deskId} name={d.name} pnl={d.pnl} />
      ))}
    </div>
  );
}

function DeskTile({ deskId, name, pnl }: { deskId: string; name: string; pnl: number }) {
  const series = useSeries(deskId, pnl);
  const delta = series.length > 1 ? pnl - series[0]! : 0;

  return (
    <StatTile
      label={name}
      value={formatCurrency(pnl)}
      delta={delta}
      deltaLabel={`${delta >= 0 ? '+' : ''}${formatCurrency(delta)} session`}
      sparklineData={series}
      accentClassName={DESK_ACCENT[deskId]}
    />
  );
}
