import * as Dialog from '@radix-ui/react-dialog';
import clsx from 'clsx';
import type { Commodity, Counterparty, Port, Vessel, Voyage } from 'shared';
import { formatCurrency } from '../../domain/selectors.js';
import { formatDateTime, formatHours } from '../../domain/scheduling.js';

interface VoyageDrilldownPanelProps {
  voyage: Voyage | null;
  vessel: Vessel | undefined;
  commodity: Commodity | undefined;
  counterparty: Counterparty | undefined;
  loadPort: Port | undefined;
  dischargePort: Port | undefined;
  onClose: () => void;
}

export function VoyageDrilldownPanel({
  voyage,
  vessel,
  commodity,
  counterparty,
  loadPort,
  dischargePort,
  onClose,
}: VoyageDrilldownPanelProps) {
  return (
    <Dialog.Root open={voyage !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed right-0 top-0 flex h-screen w-full max-w-md flex-col gap-4 overflow-y-auto border-l border-line-hairline bg-surface-card p-6 shadow-xl">
          {voyage && (
            <>
              <Dialog.Title className="text-sm font-semibold text-ink-primary">
                {vessel?.name ?? voyage.vesselId} · {commodity?.name ?? voyage.commodityId}
              </Dialog.Title>
              <Dialog.Description className="text-xs text-ink-muted">
                {loadPort?.name ?? voyage.loadPortId} → {dischargePort?.name ?? voyage.dischargePortId} ·{' '}
                {counterparty?.name ?? voyage.counterpartyId}
              </Dialog.Description>

              {voyage.laycanBreach && (
                <div className="rounded-md border border-status-loss/40 bg-status-loss/10 px-3 py-2 text-xs text-status-loss">
                  Load start falls outside the agreed laycan window ({formatDateTime(voyage.laycanStart)} –{' '}
                  {formatDateTime(voyage.laycanEnd)}).
                </div>
              )}

              <Section title="Schedule">
                <Row label="Laycan" value={`${formatDateTime(voyage.laycanStart)} – ${formatDateTime(voyage.laycanEnd)}`} />
                <Row label="Load" value={`${formatDateTime(voyage.plannedLoadStart)} – ${formatDateTime(voyage.plannedLoadEnd)}`} />
                <Row label="Transit" value={`${voyage.transitDays} days`} />
                <Row
                  label="Discharge"
                  value={`${formatDateTime(voyage.plannedDischargeStart)} – ${formatDateTime(voyage.plannedDischargeEnd)}`}
                />
                <Row label="Status" value={voyage.status} />
              </Section>

              <Section title="Cargo">
                <Row label="Volume" value={`${voyage.cargoVolume.toLocaleString()} ${voyage.cargoUnit}`} />
                <Row
                  label="Freight"
                  value={
                    voyage.freightRateBasis === 'lumpsum'
                      ? formatCurrency(voyage.freightRateUsd)
                      : `${formatCurrency(voyage.freightRateUsd)} / ${voyage.cargoUnit}`
                  }
                />
              </Section>

              <Section title="Laytime & demurrage">
                <Row label="Allowed" value={formatHours(voyage.laytimeAllowedHours)} />
                <Row
                  label="Used"
                  value={formatHours(voyage.laytimeUsedHours)}
                  valueClassName={voyage.laytimeUsedHours > voyage.laytimeAllowedHours ? 'text-status-loss' : 'text-status-gain'}
                />
                <Row label="Demurrage" value={formatCurrency(voyage.demurrageUsd)} valueClassName={voyage.demurrageUsd > 0 ? 'text-status-loss' : undefined} />
                <Row label="Dispatch" value={formatCurrency(voyage.dispatchUsd)} valueClassName={voyage.dispatchUsd > 0 ? 'text-status-gain' : undefined} />
              </Section>

              <Section title="Voyage P&L">
                <Row label="Freight revenue" value={formatCurrency(voyage.freightRevenueUsd)} />
                <Row label="Demurrage / (dispatch)" value={formatCurrency(voyage.demurrageUsd - voyage.dispatchUsd)} />
                <Row label="Bunkers" value={`(${formatCurrency(voyage.bunkerCostUsd)})`} />
                <Row label="Port costs" value={`(${formatCurrency(voyage.portCostsUsd)})`} />
                <Row label="Other costs" value={`(${formatCurrency(voyage.otherCostsUsd)})`} />
                <div className="mt-1 flex items-center justify-between border-t border-line-hairline pt-2 text-sm">
                  <span className="font-medium text-ink-secondary">Voyage P&amp;L</span>
                  <span
                    className={clsx(
                      'font-mono font-semibold tabular-nums',
                      voyage.voyagePnlUsd >= 0 ? 'text-status-gain' : 'text-status-loss',
                    )}
                  >
                    {formatCurrency(voyage.voyagePnlUsd)}
                  </span>
                </div>
              </Section>
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

function Row({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-ink-secondary">{label}</span>
      <span className={clsx('font-mono tabular-nums text-ink-primary', valueClassName)}>{value}</span>
    </div>
  );
}
