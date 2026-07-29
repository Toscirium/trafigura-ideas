import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import type { Commodity, Counterparty, CreditCheckResult, Desk, DeskId, TradeSide } from 'shared';
import { commoditiesForDesk } from 'shared';
import { useReconciliationStore } from '../../store/useReconciliationStore.js';
import { formatCurrency } from '../../domain/selectors.js';

interface CaptureTradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  desks: Desk[];
  commodities: Commodity[];
  counterparties: Counterparty[];
}

export function CaptureTradeDialog({ open, onOpenChange, desks, commodities, counterparties }: CaptureTradeDialogProps) {
  const captureTrade = useReconciliationStore((s) => s.captureTrade);

  const [deskId, setDeskId] = useState<DeskId>(desks[0]?.id ?? 'crude');
  const [commodityId, setCommodityId] = useState('');
  const [counterpartyId, setCounterpartyId] = useState('');
  const [side, setSide] = useState<TradeSide>('BUY');
  const [volume, setVolume] = useState(10_000);
  const [price, setPrice] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [creditBlock, setCreditBlock] = useState<CreditCheckResult | null>(null);

  useEffect(() => {
    if (!open) return;
    const firstDesk = desks[0]?.id ?? 'crude';
    setDeskId(firstDesk);
    setCommodityId(commoditiesForDesk(firstDesk)[0]?.id ?? '');
    setCounterpartyId(counterparties[0]?.id ?? '');
    setSide('BUY');
    setPrice(commoditiesForDesk(firstDesk)[0]?.basePrice ?? 0);
    setCreditBlock(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const availableCommodities = commoditiesForDesk(deskId);

  useEffect(() => {
    setCreditBlock(null);
  }, [counterpartyId, volume, price]);

  async function submit(force: boolean) {
    setSubmitting(true);
    try {
      const result = await captureTrade({ deskId, commodityId, counterpartyId, side, volume, price, force });
      if (result.ok) {
        setCreditBlock(null);
        onOpenChange(false);
      } else {
        setCreditBlock(result.check);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submit(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-line-hairline bg-surface-card p-6 shadow-xl">
          <Dialog.Title className="text-sm font-semibold text-ink-primary">Capture a trade</Dialog.Title>
          <Dialog.Description className="mb-4 text-xs text-ink-muted">
            Fast deal entry straight into the ETRM. It will flow through reconciliation like any other trade.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 text-xs">
            <Field label="Desk">
              <Select
                value={deskId}
                onChange={(v) => {
                  const next = v as DeskId;
                  setDeskId(next);
                  setCommodityId(commoditiesForDesk(next)[0]?.id ?? '');
                }}
              >
                {desks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Commodity">
              <Select value={commodityId} onChange={setCommodityId}>
                {availableCommodities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Counterparty">
              <Select value={counterpartyId} onChange={setCounterpartyId}>
                {counterparties.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Side">
              <Select value={side} onChange={(v) => setSide(v as TradeSide)}>
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </Select>
            </Field>

            <Field label="Volume">
              <NumberInput value={volume} onChange={setVolume} />
            </Field>

            <Field label="Price">
              <NumberInput value={price} onChange={setPrice} step="0.01" />
            </Field>

            {creditBlock && (
              <div className="col-span-2 flex flex-col gap-2 rounded-md border border-status-loss/40 bg-status-loss/10 px-3 py-2 text-xs text-status-loss">
                <div>
                  Blocked: this trade would push exposure to {formatCurrency(creditBlock.projectedExposureUsd)}, over
                  the {formatCurrency(creditBlock.limitUsd)} credit limit (
                  {(creditBlock.utilizationPct * 100).toFixed(0)}% utilized).
                </div>
                <button
                  type="button"
                  onClick={() => submit(true)}
                  disabled={submitting}
                  className="w-fit rounded-md border border-status-loss px-3 py-1 font-medium text-status-loss hover:bg-status-loss/10"
                >
                  Override &amp; capture anyway
                </button>
              </div>
            )}

            <div className="col-span-2 mt-2 flex justify-end gap-2">
              <Dialog.Close asChild>
                <button type="button" className="rounded-md border border-line-hairline px-3 py-1.5 text-ink-secondary hover:text-ink-primary">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={submitting || !commodityId || !counterpartyId}
                className="rounded-md bg-desk-crude px-3 py-1.5 font-medium text-white disabled:opacity-50"
              >
                {submitting ? 'Capturing…' : 'Capture trade'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded border border-line-hairline bg-surface-page px-2 py-1.5 text-ink-primary"
    >
      {children}
    </select>
  );
}

function NumberInput({
  value,
  onChange,
  step,
}: {
  value: number;
  onChange: (value: number) => void;
  step?: string;
}) {
  return (
    <input
      type="number"
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded border border-line-hairline bg-surface-page px-2 py-1.5 font-mono text-ink-primary"
    />
  );
}
