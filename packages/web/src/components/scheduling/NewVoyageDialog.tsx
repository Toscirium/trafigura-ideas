import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import type { Commodity, Counterparty, DeskId, Port, Vessel } from 'shared';
import { commoditiesForDesk } from 'shared';
import { useSchedulingStore } from '../../store/useSchedulingStore.js';

interface NewVoyageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vessels: Vessel[];
  ports: Port[];
  desks: { id: DeskId; name: string }[];
  commodities: Commodity[];
  counterparties: Counterparty[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toInputDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function NewVoyageDialog({
  open,
  onOpenChange,
  vessels,
  ports,
  desks,
  commodities,
  counterparties,
}: NewVoyageDialogProps) {
  const createVoyage = useSchedulingStore((s) => s.createVoyage);

  const [vesselId, setVesselId] = useState(vessels[0]?.id ?? '');
  const [deskId, setDeskId] = useState<DeskId>(desks[0]?.id ?? 'crude');
  const [commodityId, setCommodityId] = useState(commoditiesForDesk(desks[0]?.id ?? 'crude')[0]?.id ?? '');
  const [counterpartyId, setCounterpartyId] = useState(counterparties[0]?.id ?? '');
  const [loadPortId, setLoadPortId] = useState(ports[0]?.id ?? '');
  const [dischargePortId, setDischargePortId] = useState(ports[1]?.id ?? ports[0]?.id ?? '');
  const [transitDays, setTransitDays] = useState(14);
  const [laycanStartDate, setLaycanStartDate] = useState(toInputDate(Date.now() + 3 * DAY_MS));
  const [cargoVolume, setCargoVolume] = useState(700_000);
  const [freightRateUsd, setFreightRateUsd] = useState(2_000_000);
  const [laytimeAllowedHours, setLaytimeAllowedHours] = useState(72);
  const [demurrageRateUsdPerDay, setDemurrageRateUsdPerDay] = useState(45_000);
  const [dispatchRateUsdPerDay, setDispatchRateUsdPerDay] = useState(22_500);
  const [bunkerCostUsd, setBunkerCostUsd] = useState(500_000);
  const [portCostsUsd, setPortCostsUsd] = useState(120_000);
  const [otherCostsUsd, setOtherCostsUsd] = useState(40_000);
  const [submitting, setSubmitting] = useState(false);

  // Field defaults are derived from scheduling/market data that may not have hydrated
  // yet at first mount (the dialog is mounted up-front, just hidden). Re-seed them
  // every time the dialog opens so they reflect whatever has loaded by then.
  useEffect(() => {
    if (!open) return;
    setVesselId(vessels[0]?.id ?? '');
    setDeskId(desks[0]?.id ?? 'crude');
    setCommodityId(commoditiesForDesk(desks[0]?.id ?? 'crude')[0]?.id ?? '');
    setCounterpartyId(counterparties[0]?.id ?? '');
    setLoadPortId(ports[0]?.id ?? '');
    setDischargePortId(ports[1]?.id ?? ports[0]?.id ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const availableCommodities = commoditiesForDesk(deskId);
  const cargoUnit = availableCommodities.find((c) => c.id === commodityId)?.unit === 'MMBtu' ? 'cbm' : 'bbl';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const laycanStartMs = Date.parse(laycanStartDate);
      const laycanEndMs = laycanStartMs + 2 * DAY_MS;
      const loadStartMs = laycanStartMs + 0.5 * DAY_MS;
      const loadEndMs = loadStartMs + 1.5 * DAY_MS;

      await createVoyage({
        vesselId,
        deskId,
        commodityId,
        counterpartyId,
        loadPortId,
        dischargePortId,
        transitDays,
        laycanStart: new Date(laycanStartMs).toISOString(),
        laycanEnd: new Date(laycanEndMs).toISOString(),
        plannedLoadStart: new Date(loadStartMs).toISOString(),
        plannedLoadEnd: new Date(loadEndMs).toISOString(),
        cargoVolume,
        cargoUnit: cargoUnit as 'bbl' | 'mt' | 'cbm',
        freightRateBasis: 'lumpsum',
        freightRateUsd,
        demurrageRateUsdPerDay,
        dispatchRateUsdPerDay,
        laytimeAllowedHours,
        bunkerCostUsd,
        portCostsUsd,
        otherCostsUsd,
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 max-h-[85vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-line-hairline bg-surface-card p-6 shadow-xl">
          <Dialog.Title className="text-sm font-semibold text-ink-primary">Charter a new voyage</Dialog.Title>
          <Dialog.Description className="mb-4 text-xs text-ink-muted">
            Adds a fixture to the scheduling board. Timing recomputes laytime, demurrage, and voyage P&amp;L live.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 text-xs">
            <Field label="Vessel">
              <Select value={vesselId} onChange={setVesselId}>
                {vessels.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
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

            <Field label="Load port">
              <Select value={loadPortId} onChange={setLoadPortId}>
                {ports.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Discharge port">
              <Select value={dischargePortId} onChange={setDischargePortId}>
                {ports.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Laycan start">
              <input
                type="date"
                value={laycanStartDate}
                onChange={(e) => setLaycanStartDate(e.target.value)}
                className="w-full rounded border border-line-hairline bg-surface-page px-2 py-1.5 text-ink-primary"
              />
            </Field>

            <Field label="Transit (days)">
              <NumberInput value={transitDays} onChange={setTransitDays} />
            </Field>

            <Field label={`Cargo volume (${cargoUnit})`}>
              <NumberInput value={cargoVolume} onChange={setCargoVolume} />
            </Field>

            <Field label="Freight (lumpsum USD)">
              <NumberInput value={freightRateUsd} onChange={setFreightRateUsd} />
            </Field>

            <Field label="Laytime allowed (hours)">
              <NumberInput value={laytimeAllowedHours} onChange={setLaytimeAllowedHours} />
            </Field>

            <Field label="Demurrage ($/day)">
              <NumberInput value={demurrageRateUsdPerDay} onChange={setDemurrageRateUsdPerDay} />
            </Field>

            <Field label="Dispatch ($/day)">
              <NumberInput value={dispatchRateUsdPerDay} onChange={setDispatchRateUsdPerDay} />
            </Field>

            <Field label="Bunker cost ($)">
              <NumberInput value={bunkerCostUsd} onChange={setBunkerCostUsd} />
            </Field>

            <Field label="Port costs ($)">
              <NumberInput value={portCostsUsd} onChange={setPortCostsUsd} />
            </Field>

            <Field label="Other costs ($)">
              <NumberInput value={otherCostsUsd} onChange={setOtherCostsUsd} />
            </Field>

            <div className="col-span-2 mt-2 flex justify-end gap-2">
              <Dialog.Close asChild>
                <button type="button" className="rounded-md border border-line-hairline px-3 py-1.5 text-ink-secondary hover:text-ink-primary">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={submitting || !vesselId || !counterpartyId || !loadPortId || !dischargePortId}
                className="rounded-md bg-desk-crude px-3 py-1.5 font-medium text-white disabled:opacity-50"
              >
                {submitting ? 'Chartering…' : 'Charter voyage'}
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

function NumberInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded border border-line-hairline bg-surface-page px-2 py-1.5 font-mono text-ink-primary"
    />
  );
}
