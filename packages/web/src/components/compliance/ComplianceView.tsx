import { useMemo, useState } from 'react';
import clsx from 'clsx';
import type { CasePriority, CaseStatus, ComplianceCase } from 'shared';
import { useComplianceStore } from '../../store/useComplianceStore.js';
import { CASE_PRIORITY_LABEL, CASE_STATUS_LABEL, isOpenCase, sortByCreatedDesc } from '../../domain/compliance.js';
import { useSeries } from '../../domain/useSeries.js';
import { StatTile } from '../common/StatTile.js';
import { CaseDrilldownPanel } from './CaseDrilldownPanel.js';
import { ExportCsvButton } from '../common/ExportCsvButton.js';
import { PrintButton } from '../common/PrintButton.js';

type Tab = 'open' | 'all';

export function ComplianceView() {
  const cases = useComplianceStore((s) => s.cases);
  const activity = useComplianceStore((s) => s.activity);

  const [tab, setTab] = useState<Tab>('open');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const allCases = useMemo(() => sortByCreatedDesc(Object.values(cases)), [cases]);

  const openCount = allCases.filter((c) => isOpenCase(c.status)).length;
  const highPriorityOpenCount = allCases.filter((c) => isOpenCase(c.status) && c.priority === 'high').length;
  const escalatedCount = allCases.filter((c) => c.status === 'escalated').length;
  const clearedCount = allCases.filter((c) => c.status === 'cleared').length;

  const openSeries = useSeries('cases-open', openCount);
  const highSeries = useSeries('cases-high', highPriorityOpenCount);
  const escalatedSeries = useSeries('cases-escalated', escalatedCount);
  const clearedSeries = useSeries('cases-cleared', clearedCount);

  const visible = tab === 'open' ? allCases.filter((c) => isOpenCase(c.status)) : allCases;
  const selected = selectedId ? (cases[selectedId] ?? null) : null;
  const selectedActivity = useMemo(
    () => (selectedId ? activity.filter((a) => a.caseId === selectedId) : []),
    [activity, selectedId],
  );

  const csvRows = useMemo(
    () =>
      visible.map((c) => ({
        created: c.createdAt,
        entity: c.entityName,
        entityType: c.entityType,
        list: c.listType,
        matchedName: c.matchedName,
        matchScorePct: c.matchScore,
        priority: c.priority,
        assignedTo: c.assignedTo ?? '',
        status: c.status,
      })),
    [visible],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Compliance &amp; Sanctions Screening</h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
            Screened against the real OFAC SDN, EU Consolidated &amp; UN Consolidated lists · PEP/Adverse-Media are simulated
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportCsvButton filename="compliance-cases" rows={csvRows} />
          <PrintButton />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Open cases"
          value={openCount.toLocaleString()}
          delta={openSeries.length > 1 ? openCount - openSeries[0]! : 0}
          deltaLabel="session"
          sparklineData={openSeries}
          accentClassName="bg-desk-lng"
        />
        <StatTile
          label="High priority open"
          value={highPriorityOpenCount.toLocaleString()}
          delta={highSeries.length > 1 ? highPriorityOpenCount - highSeries[0]! : 0}
          deltaLabel="session"
          sparklineData={highSeries}
          accentClassName="bg-status-loss"
        />
        <StatTile
          label="Escalated"
          value={escalatedCount.toLocaleString()}
          delta={escalatedSeries.length > 1 ? escalatedCount - escalatedSeries[0]! : 0}
          deltaLabel="session"
          sparklineData={escalatedSeries}
          accentClassName="bg-desk-crude"
        />
        <StatTile
          label="Cleared"
          value={clearedCount.toLocaleString()}
          delta={clearedSeries.length > 1 ? clearedCount - clearedSeries[0]! : 0}
          deltaLabel="session"
          sparklineData={clearedSeries}
          accentClassName="bg-status-gain"
        />
      </div>

      <div className="inline-flex w-fit rounded-md border border-line-hairline bg-surface-card p-1 text-xs">
        {(
          [
            ['open', `Open (${allCases.filter((c) => isOpenCase(c.status)).length})`],
            ['all', `All cases (${allCases.length})`],
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

      <CaseTable cases={visible} onSelect={setSelectedId} />

      <CaseDrilldownPanel caseRecord={selected} activity={selectedActivity} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function CaseTable({ cases, onSelect }: { cases: ComplianceCase[]; onSelect: (id: string) => void }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line-hairline bg-surface-card shadow-card">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line-hairline bg-surface-raised/60 text-xs font-medium uppercase tracking-wide text-ink-muted">
            <th className="px-3 py-2">Created</th>
            <th className="px-3 py-2">Entity</th>
            <th className="px-3 py-2">List</th>
            <th className="px-3 py-2">Matched name</th>
            <th className="px-3 py-2 text-right">Score</th>
            <th className="px-3 py-2">Priority</th>
            <th className="px-3 py-2">Assigned</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody className="font-mono tabular-nums">
          {cases.map((c) => (
            <tr
              key={c.id}
              onClick={() => onSelect(c.id)}
              className="cursor-pointer border-b border-line-hairline last:border-0 hover:bg-surface-raised/50"
            >
              <td className="px-3 py-2 font-sans text-ink-secondary">{new Date(c.createdAt).toLocaleTimeString()}</td>
              <td className="px-3 py-2 font-sans">
                {c.entityName} <span className="text-ink-muted">({c.entityType})</span>
              </td>
              <td className="px-3 py-2 font-sans">{c.listType}</td>
              <td className="px-3 py-2 font-sans text-ink-secondary">{c.matchedName}</td>
              <td className="px-3 py-2 text-right">{c.matchScore}%</td>
              <td className="px-3 py-2">
                <PriorityPill priority={c.priority} />
              </td>
              <td className="px-3 py-2 font-sans text-ink-secondary">{c.assignedTo ?? '—'}</td>
              <td className="px-3 py-2">
                <StatusPill status={c.status} />
              </td>
            </tr>
          ))}
          {cases.length === 0 && (
            <tr>
              <td colSpan={8} className="px-3 py-8 text-center font-sans text-ink-muted">
                No screening hits right now.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function PriorityPill({ priority }: { priority: CasePriority }) {
  return (
    <span
      className={clsx(
        'rounded px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wide',
        priority === 'high' && 'bg-status-loss/15 text-status-loss',
        priority === 'medium' && 'bg-desk-lng/15 text-desk-lng',
        priority === 'low' && 'bg-ink-muted/15 text-ink-secondary',
      )}
    >
      {CASE_PRIORITY_LABEL[priority]}
    </span>
  );
}

function StatusPill({ status }: { status: CaseStatus }) {
  return (
    <span
      className={clsx(
        'rounded px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wide',
        status === 'open' && 'bg-desk-lng/15 text-desk-lng',
        status === 'under-review' && 'bg-desk-crude/15 text-desk-crude',
        status === 'escalated' && 'bg-status-loss/15 text-status-loss',
        status === 'cleared' && 'bg-status-gain/15 text-status-gain',
        status === 'blocked' && 'bg-ink-muted/15 text-ink-secondary',
      )}
    >
      {CASE_STATUS_LABEL[status]}
    </span>
  );
}
