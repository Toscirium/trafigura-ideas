import * as Dialog from '@radix-ui/react-dialog';
import clsx from 'clsx';
import { useState } from 'react';
import type { Invoice } from 'shared';
import { useSettlementStore } from '../../store/useSettlementStore.js';
import { formatCurrency } from '../../domain/selectors.js';
import { INVOICE_ISSUE_FIELD_LABEL, INVOICE_TYPE_LABEL, isOverdue } from '../../domain/settlement.js';

interface InvoiceDrilldownPanelProps {
  invoice: Invoice | null;
  onClose: () => void;
}

export function InvoiceDrilldownPanel({ invoice, onClose }: InvoiceDrilldownPanelProps) {
  const acknowledgeInvoice = useSettlementStore((s) => s.acknowledgeInvoice);
  const markPaid = useSettlementStore((s) => s.markPaid);
  const [note, setNote] = useState('');

  return (
    <Dialog.Root
      open={invoice !== null}
      onOpenChange={(open) => {
        if (!open) {
          setNote('');
          onClose();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed right-0 top-0 flex h-screen w-full max-w-lg flex-col gap-4 overflow-y-auto border-l border-line-hairline bg-surface-card p-6 shadow-xl">
          {invoice && (
            <>
              <div className="flex items-center justify-between">
                <Dialog.Title className="text-sm font-semibold text-ink-primary">
                  {invoice.invoiceNumber} · {INVOICE_TYPE_LABEL[invoice.type]}
                </Dialog.Title>
                {invoice.paid ? (
                  <Badge tone="gain">Paid</Badge>
                ) : isOverdue(invoice, Date.now()) ? (
                  <Badge tone="loss">Overdue</Badge>
                ) : (
                  <Badge tone="muted">Unpaid</Badge>
                )}
              </div>
              <Dialog.Description className="text-xs text-ink-muted">
                Issued {new Date(invoice.issuedAt).toLocaleString()} · due{' '}
                {new Date(invoice.dueDate).toLocaleDateString()} · {invoice.paymentMethod.replace('-', ' ')}
              </Dialog.Description>

              <Section title="Amount">
                <FieldRow label="Expected (ETRM)" value={formatCurrency(invoice.expectedAmountUsd)} />
                <FieldRow
                  label="Invoiced"
                  value={formatCurrency(invoice.invoicedAmountUsd)}
                  broken={invoice.matchStatus === 'issues'}
                />
              </Section>

              {invoice.issues.length > 0 && (
                <Section title="Line issues">
                  <div className="flex flex-col gap-2">
                    {invoice.issues.map((issue, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-ink-secondary">
                          {INVOICE_ISSUE_FIELD_LABEL[issue.field]}: expected {issue.expected}, invoiced{' '}
                          {issue.invoiced}
                        </span>
                        <span
                          className={clsx(
                            'shrink-0 font-medium',
                            issue.severity === 'critical' ? 'text-status-loss' : 'text-desk-lng',
                          )}
                        >
                          {issue.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {invoice.acknowledged && (
                <div className="rounded-md border border-ink-muted/30 bg-ink-muted/10 px-3 py-2 text-xs text-ink-secondary">
                  Acknowledged{invoice.acknowledgedNote ? ` — ${invoice.acknowledgedNote}` : ''}
                </div>
              )}

              <div className="mt-auto flex flex-col gap-2">
                {invoice.matchStatus === 'issues' && !invoice.acknowledged && (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Acknowledgement note (optional)"
                      rows={2}
                      className="w-full rounded-md border border-line-hairline bg-surface-page px-2 py-1.5 text-xs text-ink-primary placeholder:text-ink-muted"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        acknowledgeInvoice(invoice.id, note.trim() || undefined);
                        setNote('');
                      }}
                      className="rounded-md border border-line-hairline px-3 py-1.5 text-xs font-medium text-ink-secondary hover:text-ink-primary"
                    >
                      Acknowledge variance
                    </button>
                  </div>
                )}
                {!invoice.paid && (
                  <button
                    type="button"
                    onClick={() => markPaid(invoice.id)}
                    className="rounded-md bg-desk-crude px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Mark paid
                  </button>
                )}
              </div>

              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-md border border-line-hairline py-2 text-xs font-medium text-ink-secondary hover:text-ink-primary"
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

function FieldRow({ label, value, broken }: { label: string; value: string; broken?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-ink-secondary">{label}</span>
      <span className={clsx('font-mono tabular-nums', broken ? 'text-status-loss' : 'text-ink-primary')}>{value}</span>
    </div>
  );
}

function Badge({ tone, children }: { tone: 'gain' | 'loss' | 'muted'; children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        'rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        tone === 'gain' && 'bg-status-gain/15 text-status-gain',
        tone === 'loss' && 'bg-status-loss/15 text-status-loss',
        tone === 'muted' && 'bg-ink-muted/15 text-ink-secondary',
      )}
    >
      {children}
    </span>
  );
}
