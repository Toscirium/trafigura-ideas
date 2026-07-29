import * as Dialog from '@radix-ui/react-dialog';
import clsx from 'clsx';
import type { Position, Trade } from 'shared';
import { formatCurrency } from '../../domain/selectors.js';

interface PositionDrilldownPanelProps {
  position: Position | null;
  trades: Trade[];
  deskName: string;
  commodityName: string;
  counterpartyName: string;
  onClose: () => void;
}

export function PositionDrilldownPanel({
  position,
  trades,
  deskName,
  commodityName,
  counterpartyName,
  onClose,
}: PositionDrilldownPanelProps) {
  return (
    <Dialog.Root open={position !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed right-0 top-0 flex h-screen w-full max-w-md flex-col gap-4 border-l border-line-hairline bg-surface-card p-6 shadow-xl">
          <Dialog.Title className="text-sm font-semibold text-ink-primary">
            {deskName} · {commodityName} · {counterpartyName}
          </Dialog.Title>
          <Dialog.Description className="text-xs text-ink-muted">
            Underlying trades for this position
          </Dialog.Description>

          {position && (
            <div className="grid grid-cols-2 gap-3 rounded-md border border-line-hairline p-3 text-xs">
              <Stat label="Net volume" value={position.netVolume.toLocaleString()} />
              <Stat label="Avg price" value={position.avgPrice.toFixed(2)} />
              <Stat label="Market price" value={position.lastMarketPrice.toFixed(2)} />
              <Stat
                label="MTM P&L"
                value={formatCurrency(position.mtmPnl)}
                valueClassName={position.mtmPnl >= 0 ? 'text-status-gain' : 'text-status-loss'}
              />
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-surface-card text-ink-muted">
                <tr>
                  <th className="py-1 font-medium">Time</th>
                  <th className="py-1 font-medium">Side</th>
                  <th className="py-1 text-right font-medium">Volume</th>
                  <th className="py-1 text-right font-medium">Price</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums">
                {trades.map((trade) => (
                  <tr key={trade.id} className="border-t border-line-hairline">
                    <td className="py-1.5 text-ink-secondary">{new Date(trade.timestamp).toLocaleTimeString()}</td>
                    <td
                      className={clsx(
                        'py-1.5 font-sans font-medium',
                        trade.side === 'BUY' ? 'text-status-gain' : 'text-status-loss',
                      )}
                    >
                      {trade.side}
                    </td>
                    <td className="py-1.5 text-right">{trade.volume.toLocaleString()}</td>
                    <td className="py-1.5 text-right">{trade.price.toFixed(2)}</td>
                  </tr>
                ))}
                {trades.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-ink-muted">
                      No trades yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Dialog.Close asChild>
            <button
              type="button"
              className="rounded-md border border-line-hairline py-2 text-xs font-medium text-ink-secondary hover:text-ink-primary"
            >
              Close
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Stat({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div>
      <div className="text-ink-muted">{label}</div>
      <div className={clsx('font-mono tabular-nums text-ink-primary', valueClassName)}>{value}</div>
    </div>
  );
}
