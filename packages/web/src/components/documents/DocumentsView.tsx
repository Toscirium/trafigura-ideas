import { useMemo, useState } from 'react';
import clsx from 'clsx';
import type { DocumentStatus, DocumentType, TradeDocument } from 'shared';
import { useMarketStore } from '../../store/useMarketStore.js';
import { useDocumentStore } from '../../store/useDocumentStore.js';
import { byId } from '../../domain/selectors.js';
import { DOC_STATUS_LABEL, DOC_TYPE_LABEL, documentSummary, sortByReceivedDesc } from '../../domain/documents.js';
import { useSeries } from '../../domain/useSeries.js';
import { StatTile } from '../common/StatTile.js';
import { DocumentDrilldownPanel } from './DocumentDrilldownPanel.js';
import { ExportCsvButton } from '../common/ExportCsvButton.js';
import { PrintButton } from '../common/PrintButton.js';

type Tab = 'needs-review' | 'all';

export function DocumentsView() {
  const counterparties = useMarketStore((s) => s.counterparties);
  const documents = useDocumentStore((s) => s.documents);

  const [tab, setTab] = useState<Tab>('needs-review');
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const counterpartiesById = useMemo(() => byId(counterparties), [counterparties]);
  const allDocuments = useMemo(() => sortByReceivedDesc(Object.values(documents)), [documents]);

  const needsReviewCount = allDocuments.filter((d) => d.status === 'needs-review').length;
  const validatedCount = allDocuments.filter((d) => d.status === 'validated').length;
  const rejectedCount = allDocuments.filter((d) => d.status === 'rejected').length;
  const criticalIssueCount = allDocuments.reduce(
    (sum, d) => sum + d.issues.filter((i) => i.severity === 'critical').length,
    0,
  );

  const needsReviewSeries = useSeries('docs-needs-review', needsReviewCount);
  const validatedSeries = useSeries('docs-validated', validatedCount);
  const rejectedSeries = useSeries('docs-rejected', rejectedCount);
  const criticalSeries = useSeries('docs-critical', criticalIssueCount);

  const tabFiltered = tab === 'needs-review' ? allDocuments.filter((d) => d.status === 'needs-review') : allDocuments;
  const visible = typeFilter === 'all' ? tabFiltered : tabFiltered.filter((d) => d.docType === typeFilter);

  const selected = selectedId ? (documents[selectedId] ?? null) : null;

  const csvRows = useMemo(
    () =>
      visible.map((d) => ({
        received: d.receivedAt,
        type: DOC_TYPE_LABEL[d.docType],
        fileName: d.fileName,
        counterparty: d.counterpartyId ? (counterpartiesById[d.counterpartyId]?.name ?? d.counterpartyId) : '',
        summary: documentSummary(d),
        confidencePct: d.confidence === null ? '' : Math.round(d.confidence * 100),
        issues: d.issues.length,
        status: d.status,
      })),
    [visible, counterpartiesById],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Document Intelligence</h1>
        <div className="flex items-center gap-2">
          <ExportCsvButton filename="documents" rows={csvRows} />
          <PrintButton />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Needs review"
          value={needsReviewCount.toLocaleString()}
          delta={needsReviewSeries.length > 1 ? needsReviewCount - needsReviewSeries[0]! : 0}
          deltaLabel="session"
          sparklineData={needsReviewSeries}
          accentClassName="bg-desk-lng"
        />
        <StatTile
          label="Validated"
          value={validatedCount.toLocaleString()}
          delta={validatedSeries.length > 1 ? validatedCount - validatedSeries[0]! : 0}
          deltaLabel="session"
          sparklineData={validatedSeries}
          accentClassName="bg-status-gain"
        />
        <StatTile
          label="Rejected"
          value={rejectedCount.toLocaleString()}
          delta={rejectedSeries.length > 1 ? rejectedCount - rejectedSeries[0]! : 0}
          deltaLabel="session"
          sparklineData={rejectedSeries}
          accentClassName="bg-status-loss"
        />
        <StatTile
          label="Critical issues"
          value={criticalIssueCount.toLocaleString()}
          delta={criticalSeries.length > 1 ? criticalIssueCount - criticalSeries[0]! : 0}
          deltaLabel="across all documents"
          sparklineData={criticalSeries}
          accentClassName="bg-desk-crude"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex w-fit rounded-md border border-line-hairline bg-surface-card p-1 text-xs">
          {(
            [
              ['needs-review', `Needs review (${allDocuments.filter((d) => d.status === 'needs-review').length})`],
              ['all', `All documents (${allDocuments.length})`],
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

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as DocumentType | 'all')}
          className="rounded border border-line-hairline bg-surface-card px-2 py-1.5 text-xs text-ink-primary"
        >
          <option value="all">All types</option>
          {(Object.keys(DOC_TYPE_LABEL) as DocumentType[]).map((t) => (
            <option key={t} value={t}>
              {DOC_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </div>

      <DocumentTable documents={visible} counterpartiesById={counterpartiesById} onSelect={setSelectedId} />

      <DocumentDrilldownPanel document={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function DocumentTable({
  documents,
  counterpartiesById,
  onSelect,
}: {
  documents: TradeDocument[];
  counterpartiesById: Record<string, { name: string }>;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line-hairline bg-surface-card shadow-card">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line-hairline bg-surface-raised/60 text-xs font-medium uppercase tracking-wide text-ink-muted">
            <th className="px-3 py-2">Received</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">File</th>
            <th className="px-3 py-2">Counterparty</th>
            <th className="px-3 py-2">Summary</th>
            <th className="px-3 py-2 text-right">Confidence</th>
            <th className="px-3 py-2 text-right">Issues</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody className="font-mono tabular-nums">
          {documents.map((d) => (
            <tr
              key={d.id}
              onClick={() => onSelect(d.id)}
              className="cursor-pointer border-b border-line-hairline last:border-0 hover:bg-surface-raised/50"
            >
              <td className="px-3 py-2 font-sans text-ink-secondary">{new Date(d.receivedAt).toLocaleTimeString()}</td>
              <td className="px-3 py-2 font-sans">{DOC_TYPE_LABEL[d.docType]}</td>
              <td className="px-3 py-2 font-sans text-ink-secondary">{d.fileName}</td>
              <td className="px-3 py-2 font-sans">{d.counterpartyId ? (counterpartiesById[d.counterpartyId]?.name ?? d.counterpartyId) : '—'}</td>
              <td className="px-3 py-2 font-sans text-ink-secondary">{documentSummary(d)}</td>
              <td className="px-3 py-2 text-right">
                {d.confidence === null ? <span className="text-ink-muted">…</span> : `${Math.round(d.confidence * 100)}%`}
              </td>
              <td className={clsx('px-3 py-2 text-right', d.issues.length > 0 ? 'text-status-loss' : 'text-ink-muted')}>
                {d.issues.length || '—'}
              </td>
              <td className="px-3 py-2">
                <StatusPill status={d.status} />
              </td>
            </tr>
          ))}
          {documents.length === 0 && (
            <tr>
              <td colSpan={8} className="px-3 py-8 text-center font-sans text-ink-muted">
                Nothing here right now.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function StatusPill({ status }: { status: DocumentStatus }) {
  return (
    <span
      className={clsx(
        'rounded px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wide',
        status === 'validated' && 'bg-status-gain/15 text-status-gain',
        status === 'needs-review' && 'bg-desk-lng/15 text-desk-lng',
        status === 'rejected' && 'bg-status-loss/15 text-status-loss',
        status === 'processing' && 'animate-pulse bg-ink-muted/15 text-ink-secondary',
      )}
    >
      {DOC_STATUS_LABEL[status]}
    </span>
  );
}
