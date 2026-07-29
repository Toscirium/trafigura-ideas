import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useMarketStore } from '../../store/useMarketStore.js';
import { useCrmStore } from '../../store/useCrmStore.js';
import { useSchedulingStore } from '../../store/useSchedulingStore.js';
import { useReconciliationStore } from '../../store/useReconciliationStore.js';
import { formatCurrency } from '../../domain/selectors.js';
import { counterpartyExposureUsd, KYC_LABEL, utilizationPct } from '../../domain/crm.js';
import { useSeries } from '../../domain/useSeries.js';
import { StatTile } from '../common/StatTile.js';
import { UtilizationBar } from './UtilizationBar.js';
import { CounterpartyDrilldownPanel } from './CounterpartyDrilldownPanel.js';
import { ExportCsvButton } from '../common/ExportCsvButton.js';
import { PrintButton } from '../common/PrintButton.js';
import { ImportCounterpartiesButton } from './ImportCounterpartiesButton.js';
import { useAuthStore } from '../../store/useAuthStore.js';

export function CrmView() {
  const counterparties = useMarketStore((s) => s.counterparties);
  const positions = useMarketStore((s) => s.positions);
  const trades = useMarketStore((s) => s.trades);
  const profiles = useCrmStore((s) => s.profiles);
  const voyages = useSchedulingStore((s) => s.voyages);
  const confirmations = useReconciliationStore((s) => s.confirmations);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const positionList = useMemo(() => Object.values(positions), [positions]);
  const voyageList = useMemo(() => Object.values(voyages), [voyages]);
  const confirmationList = useMemo(() => Object.values(confirmations), [confirmations]);

  const rows = useMemo(
    () =>
      counterparties.map((cp) => {
        const profile = profiles[cp.id];
        const exposureUsd = counterpartyExposureUsd(cp.id, positionList);
        const pct = profile ? utilizationPct(exposureUsd, profile.creditLimitUsd) : 0;
        const openVoyages = voyageList.filter((v) => v.counterpartyId === cp.id && v.status !== 'completed').length;
        const openBreaks = confirmationList.filter(
          (c) => c.extracted.counterpartyId === cp.id && c.status !== 'matched' && !c.resolved,
        ).length;
        return { counterparty: cp, profile, exposureUsd, pct, openVoyages, openBreaks };
      }),
    [counterparties, profiles, positionList, voyageList, confirmationList],
  );

  const totalExposure = rows.reduce((sum, r) => sum + r.exposureUsd, 0);
  const atRiskCount = rows.filter((r) => r.pct >= 0.8).length;
  const kycIssueCount = rows.filter((r) => r.profile && r.profile.kycStatus !== 'verified').length;
  const openBreaksTotal = rows.reduce((sum, r) => sum + r.openBreaks, 0);

  const exposureSeries = useSeries('totalExposure', totalExposure);
  const atRiskSeries = useSeries('atRisk', atRiskCount);
  const kycSeries = useSeries('kycIssues', kycIssueCount);
  const breaksSeries = useSeries('openBreaksTotal', openBreaksTotal);

  const selected = selectedId ? rows.find((r) => r.counterparty.id === selectedId) : undefined;
  const role = useAuthStore((s) => s.user?.role);

  const csvRows = useMemo(
    () =>
      rows.map((r) => ({
        counterparty: r.counterparty.name,
        tier: r.counterparty.tier,
        region: r.counterparty.region,
        kycStatus: r.profile?.kycStatus ?? '',
        owner: r.profile?.relationshipOwner ?? '',
        creditLimitUsd: r.profile?.creditLimitUsd ?? 0,
        exposureUsd: r.exposureUsd,
        utilizationPct: Math.round(r.pct * 100),
      })),
    [rows],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Counterparty &amp; Credit Risk</h1>
        <div className="flex items-center gap-2">
          <ExportCsvButton filename="counterparties" rows={csvRows} />
          <PrintButton />
          {role === 'admin' && <ImportCounterpartiesButton />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Total credit exposure"
          value={formatCurrency(totalExposure)}
          delta={exposureSeries.length > 1 ? totalExposure - exposureSeries[0]! : 0}
          deltaLabel="session"
          sparklineData={exposureSeries}
          accentClassName="bg-desk-crude"
        />
        <StatTile
          label="At-risk counterparties"
          value={atRiskCount.toLocaleString()}
          delta={atRiskSeries.length > 1 ? atRiskCount - atRiskSeries[0]! : 0}
          deltaLabel=">= 80% utilized"
          sparklineData={atRiskSeries}
          accentClassName="bg-status-loss"
        />
        <StatTile
          label="KYC needs attention"
          value={kycIssueCount.toLocaleString()}
          delta={kycSeries.length > 1 ? kycIssueCount - kycSeries[0]! : 0}
          deltaLabel="pending or expired"
          sparklineData={kycSeries}
          accentClassName="bg-desk-lng"
        />
        <StatTile
          label="Open reconciliation breaks"
          value={openBreaksTotal.toLocaleString()}
          delta={breaksSeries.length > 1 ? openBreaksTotal - breaksSeries[0]! : 0}
          deltaLabel="across all counterparties"
          sparklineData={breaksSeries}
          accentClassName="bg-desk-metals"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-line-hairline bg-surface-card shadow-card">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line-hairline bg-surface-raised/60 text-xs font-medium uppercase tracking-wide text-ink-muted">
              <th className="px-3 py-2">Counterparty</th>
              <th className="px-3 py-2">Tier</th>
              <th className="px-3 py-2">Region</th>
              <th className="px-3 py-2">KYC</th>
              <th className="px-3 py-2">Owner</th>
              <th className="px-3 py-2 text-right">Credit limit</th>
              <th className="px-3 py-2 text-right">Exposure</th>
              <th className="px-3 py-2">Utilization</th>
              <th className="px-3 py-2 text-right">Open items</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {rows.map((r) => (
              <tr
                key={r.counterparty.id}
                onClick={() => setSelectedId(r.counterparty.id)}
                className="cursor-pointer border-b border-line-hairline last:border-0 hover:bg-surface-raised/50"
              >
                <td className="px-3 py-2 font-sans font-medium text-ink-primary">{r.counterparty.name}</td>
                <td className="px-3 py-2 font-sans">{r.counterparty.tier}</td>
                <td className="px-3 py-2 font-sans">{r.counterparty.region}</td>
                <td className="px-3 py-2">
                  {r.profile && <KycBadge status={r.profile.kycStatus} />}
                </td>
                <td className="px-3 py-2 font-sans text-ink-secondary">{r.profile?.relationshipOwner ?? '—'}</td>
                <td className="px-3 py-2 text-right">
                  {r.profile ? formatCurrency(r.profile.creditLimitUsd) : '—'}
                </td>
                <td className="px-3 py-2 text-right">{formatCurrency(r.exposureUsd)}</td>
                <td className="px-3 py-2">
                  <UtilizationBar pct={r.pct} />
                </td>
                <td className="px-3 py-2 text-right font-sans text-ink-secondary">
                  {r.openVoyages > 0 && <span className="mr-2">{r.openVoyages} voyages</span>}
                  {r.openBreaks > 0 && <span className="text-status-loss">{r.openBreaks} breaks</span>}
                  {r.openVoyages === 0 && r.openBreaks === 0 && '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CounterpartyDrilldownPanel
        row={selected ?? null}
        trades={trades}
        voyages={voyageList}
        confirmations={confirmationList}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}

function KycBadge({ status }: { status: 'verified' | 'pending' | 'expired' }) {
  return (
    <span
      className={clsx(
        'rounded px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wide',
        status === 'verified' && 'bg-status-gain/15 text-status-gain',
        status === 'pending' && 'bg-desk-lng/15 text-desk-lng',
        status === 'expired' && 'bg-status-loss/15 text-status-loss',
      )}
    >
      {KYC_LABEL[status]}
    </span>
  );
}
