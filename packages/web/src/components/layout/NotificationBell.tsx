import * as Popover from '@radix-ui/react-popover';
import clsx from 'clsx';
import { useMemo } from 'react';
import type { AlertSeverity } from 'shared';
import { useAlertStore } from '../../store/useAlertStore.js';

export function NotificationBell() {
  const alerts = useAlertStore((s) => s.alerts);
  const readIds = useAlertStore((s) => s.readIds);
  const markAllRead = useAlertStore((s) => s.markAllRead);

  const unreadCount = useMemo(() => alerts.filter((a) => !readIds[a.id]).length, [alerts, readIds]);

  return (
    <Popover.Root onOpenChange={(open) => open && markAllRead()}>
      <Popover.Trigger asChild>
        <button type="button" className="relative rounded-md p-1.5 text-ink-secondary hover:text-ink-primary" aria-label="Notifications">
          <BellIcon />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-loss px-1 text-[10px] font-medium text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 flex max-h-[70vh] w-96 flex-col overflow-y-auto rounded-lg border border-line-hairline bg-surface-card p-2 shadow-xl"
        >
          <div className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-muted">
            Alerts ({alerts.length})
          </div>
          {alerts.length === 0 && <div className="px-2 py-4 text-center text-xs text-ink-muted">No alerts yet.</div>}
          <div className="flex flex-col gap-1">
            {alerts.map((alert) => (
              <div key={alert.id} className="rounded-md px-2 py-2 hover:bg-surface-page">
                <div className="flex items-center justify-between gap-2">
                  <SeverityDot severity={alert.severity} />
                  <span className="flex-1 text-xs text-ink-primary">{alert.message}</span>
                </div>
                <div className="mt-1 pl-4 text-[10px] text-ink-muted">
                  {new Date(alert.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function SeverityDot({ severity }: { severity: AlertSeverity }) {
  return (
    <span
      className={clsx(
        'h-1.5 w-1.5 shrink-0 rounded-full',
        severity === 'critical' && 'bg-status-loss',
        severity === 'warning' && 'bg-desk-lng',
        severity === 'info' && 'bg-ink-muted',
      )}
      aria-hidden
    />
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
