import { useMemo, useState } from 'react';
import clsx from 'clsx';
import type { Trade, TradeConfirmation } from 'shared';
import { useMarketStore } from '../../store/useMarketStore.js';
import { useReconciliationStore } from '../../store/useReconciliationStore.js';
import { byId } from '../../domain/selectors.js';
import { awaitingConfirmationTrades, sortByReceivedDesc } from '../../domain/reconciliation.js';
import { useSeries } from '../../domain/useSeries.js';
import { StatTile } from '../common/StatTile.js';
import { ConfirmationDrilldownPanel } from './ConfirmationDrilldownPanel.js';
import { CaptureTradeDialog } from './CaptureTradeDialog.js';
import { ExportCsvButton } from '../common/ExportCsvButton.js';
import { PrintButton } from '../common/PrintButton.js';

type Tab = 'attention' | 'awaiting' | 'all';

export function ReconciliationView() {
  const desks = useMarketStore((s) => s.desks);
  const commodities = useMarketStore((s) => s.commodities);
  const counterparties = useMarketStore((s) => s.counterparties);
  const trades = useMarketStore((s) => s.trades);

  const confirmations = useReconciliationStore((s) => s.confirmations);
  const resolveBreak = useReconciliationStore((s) => s.resolveBreak);

  const [tab, setTab] = useState<Tab>('attention');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);

  const desksById = useMemo(() => byId(desks), [desks]);
  const commoditiesById = useMemo(() => byId(commodities), [commodities]);
  const counterpartiesById = useMemo(() => byId(counterparties), [counterparties]);
  const tradesById = useMemo(() => byId(trades), [trades]);

  const allConfirmations = useMemo(() => sortByReceivedDesc(Object.values(confirmations)), [confirmations]);

  const matchedCount = allConfirmations.filter((c) => c.status === 'matched').length;
  const breakCount = allConfirmations.filter((c) => c.status === 'break' && !c.resolved).length;
  const unmatchedCount = allConfirmations.filter((c) => c.status === 'unmatched' && !c.resolved).length;
  const awaiting = useMemo(
    () => awaitingConfirmationTrades(trades, allConfirmations, Date.now()),
    [trades, allConfirmations],
  );

  const matchedSeries = useSeries('matched', matchedCount);
  const breakSeries = useSeries('break', breakCount);
  const unmatchedSeries = useSeries('unmatched', unmatchedCount);
  const awaitingSeries = useSeries('awaiting', awaiting.length);

  const attentionList = allConfirmations.filter((c) => c.status !== 'matched' && !c.resolved);
  const visibleConfirmations = tab === 'attention' ? attentionList : tab === 'all' ? allConfirmations : [];

  const selected = selectedId ? (confirmations[selectedId] ?? null) : null;

  const csvRows = useMemo(
    () =>
      visibleConfirmations.map((c) => ({
        received: c.receivedAt,
        channel: c.channel,
        desk: desksById[c.extracted.deskId]?.name ?? c.extracted.deskId,
        commodity: commoditiesById[c.extracted.commodityId]?.name ?? c.extracted.commodityId,
        counterparty: counterpartiesById[c.extracted.counterpartyId]?.name ?? c.extracted.counterpartyId,
        side: c.extracted.side,
        volume: c.extracted.volume,
        price: c.extracted.price,
        status: c.status,
        resolved: c.resolved,
      })),
    [visibleConfirmations, desksById, commoditiesById, counterpartiesById],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Trade Capture &amp; Deal Reconciliation</h1>
        <div className="flex items-center gap-2">
          <ExportCsvButton filename="reconciliation" rows={csvRows} />
          <PrintButton />
          <button
            type="button"
            onClick={() => setCaptureOpen(true)}
            className="rounded-md bg-desk-crude px-3 py-1.5 text-xs font-medium text-white"
          >
            + Capture trade
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Matched"
          value={matchedCount.toLocaleString()}
          delta={matchedSeries.length > 1 ? matchedCount - matchedSeries[0]! : 0}
          deltaLabel="session"
          sparklineData={matchedSeries}
          accentClassName="bg-status-gain"
        />
        <StatTile
          label="Breaks (open)"
          value={breakCount.toLocaleString()}
          delta={breakSeries.length > 1 ? breakCount - breakSeries[0]! : 0}
          deltaLabel="session"
          sparklineData={breakSeries}
          accentClassName="bg-desk-lng"
        />
        <StatTile
          label="Unmatched (open)"
          value={unmatchedCount.toLocaleString()}
          delta={unmatchedSeries.length > 1 ? unmatchedCount - unmatchedSeries[0]! : 0}
          deltaLabel="session"
          sparklineData={unmatchedSeries}
          accentClassName="bg-status-loss"
        />
        <StatTile
          label="Awaiting confirmation"
          value={awaiting.length.toLocaleString()}
          delta={awaitingSeries.length > 1 ? awaiting.length - awaitingSeries[0]! : 0}
          deltaLabel="session"
          sparklineData={awaitingSeries}
          accentClassName="bg-desk-fuel-oil"
        />
      </div>

      <div className="inline-flex w-fit rounded-md border border-line-hairline bg-surface-card p-1 text-xs">
        {(
          [
            ['attention', `Needs attention (${attentionList.length})`],
            ['awaiting', `Awaiting confirmation (${awaiting.length})`],
            ['all', `All confirmations (${allConfirmations.length})`],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={clsx(
              'rounded px-3 py-1.5 font-medium transition-colors',
              tab === key ? 'bg-brand/15 text-brand-strong' : 'text-ink-secondary hover:text-ink-primary',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'awaiting' ? (
        <AwaitingTable
          trades={awaiting}
          desksById={desksById}
          commoditiesById={commoditiesById}
          counterpartiesById={counterpartiesById}
        />
      ) : (
        <ConfirmationTable
          confirmations={visibleConfirmations}
          desksById={desksById}
          commoditiesById={commoditiesById}
          counterpartiesById={counterpartiesById}
          onSelect={setSelectedId}
        />
      )}

      <ConfirmationDrilldownPanel
        confirmation={selected}
        trade={selected?.matchedTradeId ? tradesById[selected.matchedTradeId] : undefined}
        desksById={desksById}
        commoditiesById={commoditiesById}
        counterpartiesById={counterpartiesById}
        onClose={() => setSelectedId(null)}
        onResolve={(id, note) => resolveBreak(id, note)}
      />

      <CaptureTradeDialog
        open={captureOpen}
        onOpenChange={setCaptureOpen}
        desks={desks}
        commodities={commodities}
        counterparties={counterparties}
      />
    </div>
  );
}

function ConfirmationTable({
  confirmations,
  desksById,
  commoditiesById,
  counterpartiesById,
  onSelect,
}: {
  confirmations: TradeConfirmation[];
  desksById: ReturnType<typeof byId<{ id: string; name: string }>>;
  commoditiesById: ReturnType<typeof byId<{ id: string; name: string; unit: string }>>;
  counterpartiesById: ReturnType<typeof byId<{ id: string; name: string }>>;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line-hairline bg-surface-card shadow-card">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line-hairline bg-surface-raised/60 text-xs font-medium uppercase tracking-wide text-ink-muted">
            <th className="px-3 py-2">Received</th>
            <th className="px-3 py-2">Channel</th>
            <th className="px-3 py-2">Desk</th>
            <th className="px-3 py-2">Commodity</th>
            <th className="px-3 py-2">Counterparty</th>
            <th className="px-3 py-2 text-right">Side</th>
            <th className="px-3 py-2 text-right">Volume</th>
            <th className="px-3 py-2 text-right">Price</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody className="font-mono tabular-nums">
          {confirmations.map((c) => (
            <tr
              key={c.id}
              onClick={() => onSelect(c.id)}
              className="cursor-pointer border-b border-line-hairline last:border-0 hover:bg-surface-raised/50"
            >
              <td className="px-3 py-2 font-sans text-ink-secondary">{new Date(c.receivedAt).toLocaleTimeString()}</td>
              <td className="px-3 py-2 font-sans text-ink-secondary">{c.channel.toUpperCase()}</td>
              <td className="px-3 py-2 font-sans">{desksById[c.extracted.deskId]?.name ?? c.extracted.deskId}</td>
              <td className="px-3 py-2 font-sans">
                {commoditiesById[c.extracted.commodityId]?.name ?? c.extracted.commodityId}
              </td>
              <td className="px-3 py-2 font-sans">
                {counterpartiesById[c.extracted.counterpartyId]?.name ?? c.extracted.counterpartyId}
              </td>
              <td
                className={clsx(
                  'px-3 py-2 text-right font-sans font-medium',
                  c.extracted.side === 'BUY' ? 'text-status-gain' : 'text-status-loss',
                )}
              >
                {c.extracted.side}
              </td>
              <td className="px-3 py-2 text-right">{c.extracted.volume.toLocaleString()}</td>
              <td className="px-3 py-2 text-right">{c.extracted.price.toFixed(2)}</td>
              <td className="px-3 py-2">
                <StatusPill status={c.status} resolved={c.resolved} />
              </td>
            </tr>
          ))}
          {confirmations.length === 0 && (
            <tr>
              <td colSpan={9} className="px-3 py-8 text-center font-sans text-ink-muted">
                Nothing here right now.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function AwaitingTable({
  trades,
  desksById,
  commoditiesById,
  counterpartiesById,
}: {
  trades: Trade[];
  desksById: ReturnType<typeof byId<{ id: string; name: string }>>;
  commoditiesById: ReturnType<typeof byId<{ id: string; name: string; unit: string }>>;
  counterpartiesById: ReturnType<typeof byId<{ id: string; name: string }>>;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line-hairline bg-surface-card shadow-card">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line-hairline bg-surface-raised/60 text-xs font-medium uppercase tracking-wide text-ink-muted">
            <th className="px-3 py-2">Traded</th>
            <th className="px-3 py-2">Desk</th>
            <th className="px-3 py-2">Commodity</th>
            <th className="px-3 py-2">Counterparty</th>
            <th className="px-3 py-2 text-right">Side</th>
            <th className="px-3 py-2 text-right">Volume</th>
            <th className="px-3 py-2 text-right">Price</th>
          </tr>
        </thead>
        <tbody className="font-mono tabular-nums">
          {trades.map((t) => (
            <tr key={t.id} className="border-b border-line-hairline last:border-0">
              <td className="px-3 py-2 font-sans text-ink-secondary">{new Date(t.timestamp).toLocaleTimeString()}</td>
              <td className="px-3 py-2 font-sans">{desksById[t.deskId]?.name ?? t.deskId}</td>
              <td className="px-3 py-2 font-sans">{commoditiesById[t.commodityId]?.name ?? t.commodityId}</td>
              <td className="px-3 py-2 font-sans">{counterpartiesById[t.counterpartyId]?.name ?? t.counterpartyId}</td>
              <td
                className={clsx(
                  'px-3 py-2 text-right font-sans font-medium',
                  t.side === 'BUY' ? 'text-status-gain' : 'text-status-loss',
                )}
              >
                {t.side}
              </td>
              <td className="px-3 py-2 text-right">{t.volume.toLocaleString()}</td>
              <td className="px-3 py-2 text-right">{t.price.toFixed(2)}</td>
            </tr>
          ))}
          {trades.length === 0 && (
            <tr>
              <td colSpan={7} className="px-3 py-8 text-center font-sans text-ink-muted">
                Everything's been confirmed.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function StatusPill({ status, resolved }: { status: TradeConfirmation['status']; resolved: boolean }) {
  if (resolved) {
    return (
      <span className="rounded bg-status-gain/15 px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wide text-status-gain">
        Resolved
      </span>
    );
  }
  return (
    <span
      className={clsx(
        'rounded px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wide',
        status === 'matched' && 'bg-status-gain/15 text-status-gain',
        status === 'break' && 'bg-desk-lng/15 text-desk-lng',
        status === 'unmatched' && 'bg-status-loss/15 text-status-loss',
      )}
    >
      {status}
    </span>
  );
}
