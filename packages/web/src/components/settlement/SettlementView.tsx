import { useMemo, useState } from 'react';
import clsx from 'clsx';
import type { Invoice, InvoiceType } from 'shared';
import { useMarketStore } from '../../store/useMarketStore.js';
import { useSettlementStore } from '../../store/useSettlementStore.js';
import { byId, formatCurrency } from '../../domain/selectors.js';
import { INVOICE_TYPE_LABEL, isOverdue, sortByIssuedDesc, totalOutstandingUsd } from '../../domain/settlement.js';
import { useSeries } from '../../domain/useSeries.js';
import { StatTile } from '../common/StatTile.js';
import { InvoiceDrilldownPanel } from './InvoiceDrilldownPanel.js';
import { ExportCsvButton } from '../common/ExportCsvButton.js';
import { PrintButton } from '../common/PrintButton.js';

type Tab = 'attention' | 'all';

export function SettlementView() {
  const desks = useMarketStore((s) => s.desks);
  const counterparties = useMarketStore((s) => s.counterparties);
  const invoices = useSettlementStore((s) => s.invoices);

  const [tab, setTab] = useState<Tab>('attention');
  const [typeFilter, setTypeFilter] = useState<InvoiceType | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const desksById = useMemo(() => byId(desks), [desks]);
  const counterpartiesById = useMemo(() => byId(counterparties), [counterparties]);
  const now = Date.now();

  const allInvoices = useMemo(() => sortByIssuedDesc(Object.values(invoices)), [invoices]);

  const outstandingUsd = totalOutstandingUsd(allInvoices);
  const overdueCount = allInvoices.filter((i) => isOverdue(i, now)).length;
  const issuesCount = allInvoices.filter((i) => i.matchStatus === 'issues' && !i.acknowledged).length;
  const paidCount = allInvoices.filter((i) => i.paid).length;

  const outstandingSeries = useSeries('outstanding', outstandingUsd);
  const overdueSeries = useSeries('overdue', overdueCount);
  const issuesSeries = useSeries('invoice-issues', issuesCount);
  const paidSeries = useSeries('paid', paidCount);

  const attentionList = allInvoices.filter((i) => (i.matchStatus === 'issues' && !i.acknowledged) || isOverdue(i, now));
  const tabFiltered = tab === 'attention' ? attentionList : allInvoices;
  const visible = typeFilter === 'all' ? tabFiltered : tabFiltered.filter((i) => i.type === typeFilter);

  const selected = selectedId ? (invoices[selectedId] ?? null) : null;

  const csvRows = useMemo(
    () =>
      visible.map((i) => ({
        invoiceNumber: i.invoiceNumber,
        type: i.type,
        desk: desksById[i.deskId]?.name ?? i.deskId,
        counterparty: counterpartiesById[i.counterpartyId]?.name ?? i.counterpartyId,
        issuedAt: i.issuedAt,
        dueDate: i.dueDate,
        invoicedAmountUsd: i.invoicedAmountUsd,
        matchStatus: i.matchStatus,
        paid: i.paid,
      })),
    [visible, desksById, counterpartiesById],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Settlement &amp; Invoicing</h1>
        <div className="flex items-center gap-2">
          <ExportCsvButton filename="settlement" rows={csvRows} />
          <PrintButton />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Outstanding"
          value={formatCurrency(outstandingUsd)}
          delta={outstandingSeries.length > 1 ? outstandingUsd - outstandingSeries[0]! : 0}
          deltaLabel="session"
          sparklineData={outstandingSeries}
          accentClassName="bg-desk-crude"
        />
        <StatTile
          label="Overdue"
          value={overdueCount.toLocaleString()}
          delta={overdueSeries.length > 1 ? overdueCount - overdueSeries[0]! : 0}
          deltaLabel="session"
          sparklineData={overdueSeries}
          accentClassName="bg-status-loss"
        />
        <StatTile
          label="Unacknowledged issues"
          value={issuesCount.toLocaleString()}
          delta={issuesSeries.length > 1 ? issuesCount - issuesSeries[0]! : 0}
          deltaLabel="session"
          sparklineData={issuesSeries}
          accentClassName="bg-desk-lng"
        />
        <StatTile
          label="Paid"
          value={paidCount.toLocaleString()}
          delta={paidSeries.length > 1 ? paidCount - paidSeries[0]! : 0}
          deltaLabel="session"
          sparklineData={paidSeries}
          accentClassName="bg-status-gain"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex w-fit rounded-md border border-line-hairline bg-surface-card p-1 text-xs">
          {(
            [
              ['attention', `Needs attention (${attentionList.length})`],
              ['all', `All invoices (${allInvoices.length})`],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={clsx(
                'rounded px-3 py-1.5 font-medium transition-colors',
                tab === key ? 'bg-line-hairline text-ink-primary' : 'text-ink-secondary hover:text-ink-primary',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as InvoiceType | 'all')}
          className="rounded border border-line-hairline bg-surface-card px-2 py-1.5 text-xs text-ink-primary"
        >
          <option value="all">All types</option>
          {(Object.keys(INVOICE_TYPE_LABEL) as InvoiceType[]).map((t) => (
            <option key={t} value={t}>
              {INVOICE_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </div>

      <InvoiceTable
        invoices={visible}
        desksById={desksById}
        counterpartiesById={counterpartiesById}
        now={now}
        onSelect={setSelectedId}
      />

      <InvoiceDrilldownPanel invoice={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function InvoiceTable({
  invoices,
  desksById,
  counterpartiesById,
  now,
  onSelect,
}: {
  invoices: Invoice[];
  desksById: Record<string, { name: string }>;
  counterpartiesById: Record<string, { name: string }>;
  now: number;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line-hairline">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line-hairline bg-surface-card text-xs font-medium uppercase tracking-wide text-ink-muted">
            <th className="px-3 py-2">Invoice</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Desk</th>
            <th className="px-3 py-2">Counterparty</th>
            <th className="px-3 py-2">Due</th>
            <th className="px-3 py-2 text-right">Amount</th>
            <th className="px-3 py-2">Match</th>
            <th className="px-3 py-2">Payment</th>
          </tr>
        </thead>
        <tbody className="font-mono tabular-nums">
          {invoices.map((inv) => (
            <tr
              key={inv.id}
              onClick={() => onSelect(inv.id)}
              className="cursor-pointer border-b border-line-hairline last:border-0 hover:bg-surface-card"
            >
              <td className="px-3 py-2 font-sans text-ink-secondary">{inv.invoiceNumber}</td>
              <td className="px-3 py-2 font-sans">{INVOICE_TYPE_LABEL[inv.type]}</td>
              <td className="px-3 py-2 font-sans">{desksById[inv.deskId]?.name ?? inv.deskId}</td>
              <td className="px-3 py-2 font-sans">{counterpartiesById[inv.counterpartyId]?.name ?? inv.counterpartyId}</td>
              <td className="px-3 py-2 font-sans text-ink-secondary">{new Date(inv.dueDate).toLocaleDateString()}</td>
              <td className="px-3 py-2 text-right">{formatCurrency(inv.invoicedAmountUsd)}</td>
              <td className="px-3 py-2">
                <MatchPill status={inv.matchStatus} acknowledged={inv.acknowledged} />
              </td>
              <td className="px-3 py-2">
                <PaymentPill paid={inv.paid} overdue={isOverdue(inv, now)} />
              </td>
            </tr>
          ))}
          {invoices.length === 0 && (
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

function MatchPill({ status, acknowledged }: { status: Invoice['matchStatus']; acknowledged: boolean }) {
  if (status === 'matched') {
    return (
      <span className="rounded bg-status-gain/15 px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wide text-status-gain">
        Matched
      </span>
    );
  }
  return (
    <span
      className={clsx(
        'rounded px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wide',
        acknowledged ? 'bg-ink-muted/15 text-ink-secondary' : 'bg-desk-lng/15 text-desk-lng',
      )}
    >
      {acknowledged ? 'Issues (ack)' : 'Issues'}
    </span>
  );
}

function PaymentPill({ paid, overdue }: { paid: boolean; overdue: boolean }) {
  if (paid) {
    return (
      <span className="rounded bg-status-gain/15 px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wide text-status-gain">
        Paid
      </span>
    );
  }
  if (overdue) {
    return (
      <span className="rounded bg-status-loss/15 px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wide text-status-loss">
        Overdue
      </span>
    );
  }
  return (
    <span className="rounded bg-ink-muted/15 px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wide text-ink-secondary">
      Unpaid
    </span>
  );
}
