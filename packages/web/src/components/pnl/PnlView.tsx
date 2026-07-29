import { useMemo } from 'react';
import { PnlByDeskTiles } from './PnlByDeskTiles.js';
import { PnlTrendChart } from './PnlTrendChart.js';
import { HistoricalPnlChart } from './HistoricalPnlChart.js';
import { PnlGrid } from './PnlGrid.js';
import { useMarketStore } from '../../store/useMarketStore.js';
import { byId } from '../../domain/selectors.js';
import { ExportCsvButton } from '../common/ExportCsvButton.js';
import { PrintButton } from '../common/PrintButton.js';

export function PnlView() {
  const desks = useMarketStore((s) => s.desks);
  const commodities = useMarketStore((s) => s.commodities);
  const counterparties = useMarketStore((s) => s.counterparties);
  const positions = useMarketStore((s) => s.positions);

  const desksById = useMemo(() => byId(desks), [desks]);
  const commoditiesById = useMemo(() => byId(commodities), [commodities]);
  const counterpartiesById = useMemo(() => byId(counterparties), [counterparties]);

  const csvRows = useMemo(
    () =>
      Object.values(positions).map((p) => ({
        desk: desksById[p.deskId]?.name ?? p.deskId,
        commodity: commoditiesById[p.commodityId]?.name ?? p.commodityId,
        counterparty: counterpartiesById[p.counterpartyId]?.name ?? p.counterpartyId,
        netVolume: p.netVolume,
        avgPrice: p.avgPrice,
        marketPrice: p.lastMarketPrice,
        mtmPnlUsd: p.mtmPnl,
      })),
    [positions, desksById, commoditiesById, counterpartiesById],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Mark-to-Market P&amp;L</h1>
        <div className="flex items-center gap-2">
          <ExportCsvButton filename="pnl" rows={csvRows} />
          <PrintButton />
        </div>
      </div>
      <PnlByDeskTiles />
      <PnlTrendChart />
      <HistoricalPnlChart />
      <PnlGrid />
    </div>
  );
}
