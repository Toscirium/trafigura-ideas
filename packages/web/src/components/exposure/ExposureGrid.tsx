import { useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getGroupedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import clsx from 'clsx';
import type { Position } from 'shared';
import { useMarketStore } from '../../store/useMarketStore.js';
import { byId, tradesForPosition } from '../../domain/selectors.js';
import { PnlText } from '../common/PnlText.js';
import { GroupToggle, type GroupKey } from './GroupToggle.js';
import { PositionDrilldownPanel } from './PositionDrilldownPanel.js';
import { ExportCsvButton } from '../common/ExportCsvButton.js';
import { PrintButton } from '../common/PrintButton.js';

interface ExposureRow extends Position {
  deskName: string;
  commodityName: string;
  commodityUnit: string;
  counterpartyName: string;
}

const columnHelper = createColumnHelper<ExposureRow>();

export function ExposureGrid() {
  const desks = useMarketStore((s) => s.desks);
  const commodities = useMarketStore((s) => s.commodities);
  const counterparties = useMarketStore((s) => s.counterparties);
  const positions = useMarketStore((s) => s.positions);
  const trades = useMarketStore((s) => s.trades);

  const [groupKey, setGroupKey] = useState<GroupKey>('deskName');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const desksById = useMemo(() => byId(desks), [desks]);
  const commoditiesById = useMemo(() => byId(commodities), [commodities]);
  const counterpartiesById = useMemo(() => byId(counterparties), [counterparties]);

  const rows = useMemo<ExposureRow[]>(
    () =>
      Object.values(positions).map((p) => ({
        ...p,
        deskName: desksById[p.deskId]?.name ?? p.deskId,
        commodityName: commoditiesById[p.commodityId]?.name ?? p.commodityId,
        commodityUnit: commoditiesById[p.commodityId]?.unit ?? '',
        counterpartyName: counterpartiesById[p.counterpartyId]?.name ?? p.counterpartyId,
      })),
    [positions, desksById, commoditiesById, counterpartiesById],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor('deskName', { header: 'Desk' }),
      columnHelper.accessor('commodityName', { header: 'Commodity' }),
      columnHelper.accessor('counterpartyName', { header: 'Counterparty' }),
      columnHelper.accessor('netVolume', {
        header: 'Net Vol',
        aggregationFn: 'sum',
        cell: (info) => info.getValue().toLocaleString(),
        aggregatedCell: (info) => info.getValue<number>().toLocaleString(),
      }),
      columnHelper.accessor('avgPrice', {
        header: 'Avg Price',
        aggregationFn: 'mean',
        cell: (info) => info.getValue().toFixed(2),
        aggregatedCell: (info) => info.getValue<number>().toFixed(2),
      }),
      columnHelper.accessor('lastMarketPrice', {
        header: 'Market',
        aggregationFn: 'mean',
        cell: (info) => info.getValue().toFixed(2),
        aggregatedCell: (info) => info.getValue<number>().toFixed(2),
      }),
      columnHelper.accessor('mtmPnl', {
        header: 'MTM P&L',
        aggregationFn: 'sum',
        cell: (info) => <PnlText value={info.getValue()} />,
        aggregatedCell: (info) => <PnlText value={info.getValue<number>()} />,
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { grouping: [groupKey] },
    onGroupingChange: () => {},
    getCoreRowModel: getCoreRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    autoResetExpanded: false,
  });

  const selectedPosition = selectedKey ? (positions[selectedKey] ?? null) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Exposure</h1>
        <div className="flex items-center gap-2">
          <ExportCsvButton
            filename="exposure"
            rows={rows.map((r) => ({
              desk: r.deskName,
              commodity: r.commodityName,
              counterparty: r.counterpartyName,
              netVolume: r.netVolume,
              avgPrice: r.avgPrice,
              marketPrice: r.lastMarketPrice,
              mtmPnlUsd: r.mtmPnl,
            }))}
          />
          <PrintButton />
          <GroupToggle value={groupKey} onChange={setGroupKey} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line-hairline">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-line-hairline bg-surface-card">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={clsx(
                      'px-3 py-2 text-xs font-medium uppercase tracking-wide text-ink-muted',
                      ['netVolume', 'avgPrice', 'lastMarketPrice', 'mtmPnl'].includes(header.column.id) &&
                        'text-right',
                    )}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="font-mono tabular-nums">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => {
                  if (!row.getIsGrouped()) setSelectedKey(row.original.key);
                }}
                className={clsx(
                  'border-b border-line-hairline last:border-0',
                  row.getIsGrouped() ? 'bg-surface-card/60 cursor-pointer' : 'cursor-pointer hover:bg-surface-card',
                )}
              >
                {row.getVisibleCells().map((cell) => {
                  const isNumeric = ['netVolume', 'avgPrice', 'lastMarketPrice', 'mtmPnl'].includes(
                    cell.column.id,
                  );
                  return (
                    <td
                      key={cell.id}
                      className={clsx('px-3 py-2', isNumeric && 'text-right')}
                      style={cell.getIsGrouped() ? { paddingLeft: row.depth * 20 + 12 } : undefined}
                    >
                      {cell.getIsGrouped() ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            row.toggleExpanded();
                          }}
                          className="flex items-center gap-2 font-sans font-medium text-ink-primary"
                        >
                          <span aria-hidden>{row.getIsExpanded() ? '▾' : '▸'}</span>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          <span className="text-ink-muted">({row.subRows.length})</span>
                        </button>
                      ) : cell.getIsAggregated() ? (
                        flexRender(
                          cell.column.columnDef.aggregatedCell ?? cell.column.columnDef.cell,
                          cell.getContext(),
                        )
                      ) : cell.getIsPlaceholder() ? null : (
                        flexRender(cell.column.columnDef.cell, cell.getContext())
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-ink-muted">
                  Waiting for trades…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PositionDrilldownPanel
        position={selectedPosition}
        trades={selectedPosition ? tradesForPosition(trades, selectedPosition) : []}
        deskName={selectedPosition ? (desksById[selectedPosition.deskId]?.name ?? selectedPosition.deskId) : ''}
        commodityName={
          selectedPosition ? (commoditiesById[selectedPosition.commodityId]?.name ?? selectedPosition.commodityId) : ''
        }
        counterpartyName={
          selectedPosition
            ? (counterpartiesById[selectedPosition.counterpartyId]?.name ?? selectedPosition.counterpartyId)
            : ''
        }
        onClose={() => setSelectedKey(null)}
      />
    </div>
  );
}
