import { useMemo, useState } from 'react';
import { useAuditStore } from '../../store/useAuditStore.js';
import { ExportCsvButton } from '../common/ExportCsvButton.js';
import { PrintButton } from '../common/PrintButton.js';

export function AuditView() {
  const entries = useAuditStore((s) => s.entries);
  const [search, setSearch] = useState('');

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) =>
      [e.username, e.action, e.entityType, e.entityId, e.details ?? ''].some((f) => f.toLowerCase().includes(q)),
    );
  }, [entries, search]);

  const csvRows = useMemo(
    () =>
      visible.map((e) => ({
        timestamp: e.timestamp,
        user: e.username,
        role: e.role,
        action: e.action,
        entityType: e.entityType,
        entityId: e.entityId,
        details: e.details ?? '',
      })),
    [visible],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Audit Log</h1>
        <div className="flex items-center gap-2">
          <ExportCsvButton filename="audit-log" rows={csvRows} />
          <PrintButton />
        </div>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search user, action, entity…"
        className="no-print w-full max-w-sm rounded-md border border-line-hairline bg-surface-card px-3 py-1.5 text-xs text-ink-primary placeholder:text-ink-muted"
      />

      <div className="overflow-x-auto rounded-lg border border-line-hairline">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line-hairline bg-surface-card text-xs font-medium uppercase tracking-wide text-ink-muted">
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Entity</th>
              <th className="px-3 py-2">Details</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {visible.map((e) => (
              <tr key={e.id} className="border-b border-line-hairline last:border-0">
                <td className="px-3 py-2 font-sans text-ink-secondary">{new Date(e.timestamp).toLocaleString()}</td>
                <td className="px-3 py-2 font-sans">{e.username}</td>
                <td className="px-3 py-2 font-sans text-ink-secondary">{e.role}</td>
                <td className="px-3 py-2 font-sans">{e.action}</td>
                <td className="px-3 py-2 font-sans text-ink-secondary">
                  {e.entityType} · {e.entityId}
                </td>
                <td className="max-w-xs truncate px-3 py-2 text-[11px] text-ink-muted" title={e.details ?? ''}>
                  {e.details ?? '—'}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center font-sans text-ink-muted">
                  No audit entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
