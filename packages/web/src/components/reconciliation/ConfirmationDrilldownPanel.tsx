import * as Dialog from '@radix-ui/react-dialog';
import clsx from 'clsx';
import { useState } from 'react';
import type { Commodity, Counterparty, Desk, Trade, TradeConfirmation } from 'shared';
import { BREAK_FIELD_LABEL } from '../../domain/reconciliation.js';
import { formatDateTime } from '../../domain/scheduling.js';

interface ConfirmationDrilldownPanelProps {
  confirmation: TradeConfirmation | null;
  trade: Trade | undefined;
  desksById: Record<string, Desk>;
  commoditiesById: Record<string, Commodity>;
  counterpartiesById: Record<string, Counterparty>;
  onClose: () => void;
  onResolve: (id: string, note?: string) => void;
}

export function ConfirmationDrilldownPanel({
  confirmation,
  trade,
  desksById,
  commoditiesById,
  counterpartiesById,
  onClose,
  onResolve,
}: ConfirmationDrilldownPanelProps) {
  const [note, setNote] = useState('');

  return (
    <Dialog.Root
      open={confirmation !== null}
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
          {confirmation && (
            <>
              <div className="flex items-center justify-between">
                <Dialog.Title className="text-sm font-semibold text-ink-primary">
                  Confirmation · {confirmation.channel.toUpperCase()}
                </Dialog.Title>
                <StatusBadge status={confirmation.status} />
              </div>
              <Dialog.Description className="text-xs text-ink-muted">
                Received {formatDateTime(confirmation.receivedAt)}
              </Dialog.Description>

              <Section title="Raw message">
                <pre className="whitespace-pre-wrap break-words rounded-md bg-surface-page p-3 font-mono text-[11px] leading-relaxed text-ink-secondary">
                  {confirmation.rawText}
                </pre>
              </Section>

              <Section title="Confirmed vs. ETRM">
                <div className="grid grid-cols-[80px_1fr_1fr] gap-2 text-[10px] uppercase tracking-wide text-ink-muted">
                  <span />
                  <span>ETRM</span>
                  <span>Confirmed</span>
                </div>
                <FieldRow
                  label="Desk"
                  confirmed={desksById[confirmation.extracted.deskId]?.name ?? confirmation.extracted.deskId}
                  etrm={trade ? (desksById[trade.deskId]?.name ?? trade.deskId) : undefined}
                />
                <FieldRow
                  label="Commodity"
                  confirmed={
                    commoditiesById[confirmation.extracted.commodityId]?.name ?? confirmation.extracted.commodityId
                  }
                  etrm={trade ? (commoditiesById[trade.commodityId]?.name ?? trade.commodityId) : undefined}
                />
                <FieldRow label="Side" confirmed={confirmation.extracted.side} etrm={trade?.side} />
                <FieldRow
                  label="Counterparty"
                  confirmed={
                    counterpartiesById[confirmation.extracted.counterpartyId]?.name ??
                    confirmation.extracted.counterpartyId
                  }
                  etrm={trade ? (counterpartiesById[trade.counterpartyId]?.name ?? trade.counterpartyId) : undefined}
                  broken={confirmation.breaks.some((b) => b.field === 'counterparty')}
                />
                <FieldRow
                  label="Volume"
                  confirmed={confirmation.extracted.volume.toLocaleString()}
                  etrm={trade?.volume.toLocaleString()}
                  broken={confirmation.breaks.some((b) => b.field === 'volume')}
                />
                <FieldRow
                  label="Price"
                  confirmed={confirmation.extracted.price.toFixed(2)}
                  etrm={trade?.price.toFixed(2)}
                  broken={confirmation.breaks.some((b) => b.field === 'price')}
                />
                <FieldRow
                  label="Trade date"
                  confirmed={confirmation.extracted.tradeDate.slice(0, 10)}
                  etrm={trade?.timestamp.slice(0, 10)}
                  broken={confirmation.breaks.some((b) => b.field === 'tradeDate')}
                />
              </Section>

              {confirmation.status === 'unmatched' && (
                <div className="rounded-md border border-status-loss/40 bg-status-loss/10 px-3 py-2 text-xs text-status-loss">
                  No ETRM trade found within the matching window — this confirmation may reference a deal that was
                  never captured.
                </div>
              )}

              {confirmation.breaks.length > 0 && (
                <Section title="Breaks">
                  <div className="flex flex-col gap-1.5">
                    {confirmation.breaks.map((b) => (
                      <div key={b.field} className="flex items-center justify-between text-xs">
                        <span className="text-ink-secondary">{BREAK_FIELD_LABEL[b.field]}</span>
                        <span
                          className={clsx(
                            'font-medium',
                            b.severity === 'critical' ? 'text-status-loss' : 'text-desk-lng',
                          )}
                        >
                          {b.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {confirmation.resolved ? (
                <div className="rounded-md border border-status-gain/40 bg-status-gain/10 px-3 py-2 text-xs text-status-gain">
                  Resolved {confirmation.resolvedAt ? formatDateTime(confirmation.resolvedAt) : ''}
                  {confirmation.resolutionNote ? ` — ${confirmation.resolutionNote}` : ''}
                </div>
              ) : (
                confirmation.status !== 'matched' && (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Resolution note (optional)"
                      rows={2}
                      className="w-full rounded-md border border-line-hairline bg-surface-page px-2 py-1.5 text-xs text-ink-primary placeholder:text-ink-muted"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        onResolve(confirmation.id, note.trim() || undefined);
                        setNote('');
                      }}
                      className="rounded-md bg-desk-crude px-3 py-1.5 text-xs font-medium text-white"
                    >
                      Mark resolved
                    </button>
                  </div>
                )
              )}
            </>
          )}

          <Dialog.Close asChild>
            <button
              type="button"
              className="mt-auto rounded-md border border-line-hairline py-2 text-xs font-medium text-ink-secondary hover:text-ink-primary"
            >
              Close
            </button>
          </Dialog.Close>
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

function FieldRow({
  label,
  confirmed,
  etrm,
  broken,
}: {
  label: string;
  confirmed: string;
  etrm: string | undefined;
  broken?: boolean;
}) {
  return (
    <div className="grid grid-cols-[80px_1fr_1fr] items-center gap-2 text-xs">
      <span className="text-ink-secondary">{label}</span>
      <span className={clsx('font-mono tabular-nums', broken ? 'text-status-loss' : 'text-ink-primary')}>
        {etrm ?? '—'}
      </span>
      <span className={clsx('font-mono tabular-nums', broken ? 'text-status-loss' : 'text-ink-muted')}>
        {confirmed}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: TradeConfirmation['status'] }) {
  return (
    <span
      className={clsx(
        'rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        status === 'matched' && 'bg-status-gain/15 text-status-gain',
        status === 'break' && 'bg-desk-lng/15 text-desk-lng',
        status === 'unmatched' && 'bg-status-loss/15 text-status-loss',
      )}
    >
      {status}
    </span>
  );
}
