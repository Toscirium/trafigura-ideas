import * as Dialog from '@radix-ui/react-dialog';
import clsx from 'clsx';
import { useState } from 'react';
import type { CaseActivityEntry, CaseStatus, ComplianceCase } from 'shared';
import { useComplianceStore } from '../../store/useComplianceStore.js';
import { ALL_CASE_STATUSES, CASE_PRIORITY_LABEL, CASE_STATUS_LABEL, COMPLIANCE_OFFICERS } from '../../domain/compliance.js';

interface CaseDrilldownPanelProps {
  caseRecord: ComplianceCase | null;
  activity: CaseActivityEntry[];
  onClose: () => void;
}

export function CaseDrilldownPanel({ caseRecord, activity, onClose }: CaseDrilldownPanelProps) {
  const updateStatus = useComplianceStore((s) => s.updateStatus);
  const assign = useComplianceStore((s) => s.assign);
  const addComment = useComplianceStore((s) => s.addComment);

  const [statusNote, setStatusNote] = useState('');
  const [nextStatus, setNextStatus] = useState<CaseStatus>('under-review');
  const [comment, setComment] = useState('');

  return (
    <Dialog.Root
      open={caseRecord !== null}
      onOpenChange={(open) => {
        if (!open) {
          setStatusNote('');
          setComment('');
          onClose();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed right-0 top-0 flex h-screen w-full max-w-lg flex-col gap-4 overflow-y-auto border-l border-line-hairline bg-surface-card p-6 shadow-xl">
          {caseRecord && (
            <>
              <div className="flex items-center justify-between">
                <Dialog.Title className="text-sm font-semibold text-ink-primary">
                  {caseRecord.entityName} <span className="text-ink-muted">({caseRecord.entityType})</span>
                </Dialog.Title>
                <StatusBadge status={caseRecord.status} />
              </div>
              <Dialog.Description className="text-xs text-ink-muted">
                Opened {new Date(caseRecord.createdAt).toLocaleString()}
              </Dialog.Description>

              <Section title="Screening hit">
                <FieldRow label="List" value={caseRecord.listType} />
                <FieldRow label="Matched name" value={caseRecord.matchedName} />
                <FieldRow label="Match score" value={`${caseRecord.matchScore}%`} />
                <FieldRow label="Priority" value={CASE_PRIORITY_LABEL[caseRecord.priority]} />
                <FieldRow label="Assigned to" value={caseRecord.assignedTo ?? 'Unassigned'} />
              </Section>

              <Section title="Assign">
                <div className="flex gap-2">
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) assign(caseRecord.id, e.target.value);
                    }}
                    className="flex-1 rounded border border-line-hairline bg-surface-page px-2 py-1.5 text-xs text-ink-primary"
                  >
                    <option value="" disabled>
                      Choose an officer…
                    </option>
                    {COMPLIANCE_OFFICERS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              </Section>

              <Section title="Change status">
                <div className="flex flex-col gap-2">
                  <select
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value as CaseStatus)}
                    className="rounded border border-line-hairline bg-surface-page px-2 py-1.5 text-xs text-ink-primary"
                  >
                    {ALL_CASE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {CASE_STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="Rationale (optional)"
                    rows={2}
                    className="w-full rounded-md border border-line-hairline bg-surface-page px-2 py-1.5 text-xs text-ink-primary placeholder:text-ink-muted"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      updateStatus(caseRecord.id, nextStatus, statusNote.trim() || undefined);
                      setStatusNote('');
                    }}
                    disabled={nextStatus === caseRecord.status}
                    className="rounded-md bg-desk-crude px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  >
                    Apply status change
                  </button>
                </div>
              </Section>

              <Section title="Activity">
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add a comment…"
                      className="flex-1 rounded border border-line-hairline bg-surface-page px-2 py-1.5 text-xs text-ink-primary placeholder:text-ink-muted"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!comment.trim()) return;
                        addComment(caseRecord.id, comment.trim());
                        setComment('');
                      }}
                      className="rounded-md border border-line-hairline px-3 py-1.5 text-xs font-medium text-ink-secondary hover:text-ink-primary"
                    >
                      Post
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {activity.map((entry) => (
                      <div key={entry.id} className="rounded-md bg-surface-page p-2 text-xs">
                        <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-ink-muted">
                          <span>
                            {entry.author} · {entry.action}
                          </span>
                          <span>{new Date(entry.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <div className="mt-1 text-ink-secondary">{entry.body}</div>
                      </div>
                    ))}
                    {activity.length === 0 && <div className="text-xs text-ink-muted">No activity yet.</div>}
                  </div>
                </div>
              </Section>

              <Dialog.Close asChild>
                <button
                  type="button"
                  className="mt-auto rounded-md border border-line-hairline py-2 text-xs font-medium text-ink-secondary hover:text-ink-primary"
                >
                  Close
                </button>
              </Dialog.Close>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-line-hairline p-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">{title}</div>
      {children}
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-ink-secondary">{label}</span>
      <span className="font-mono tabular-nums text-ink-primary">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: CaseStatus }) {
  return (
    <span
      className={clsx(
        'rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
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
