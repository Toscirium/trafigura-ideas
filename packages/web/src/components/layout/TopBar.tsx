import { ConnectionBadge } from '../common/ConnectionBadge.js';
import { PriceTicker } from '../common/PriceTicker.js';
import { NotificationBell } from './NotificationBell.js';
import { useAuthStore } from '../../store/useAuthStore.js';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  trader: 'Trader',
  compliance: 'Compliance',
  settlements: 'Settlements',
  credit_risk: 'Credit Risk',
};

export function TopBar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <header className="no-print flex h-16 shrink-0 items-center gap-6 border-b border-line-hairline bg-surface-page px-4">
      <div className="shrink-0 text-sm font-semibold tracking-wide text-ink-primary">
        VANTAGE <span className="text-ink-muted">RISK</span>
      </div>
      <div className="min-w-0 flex-1">
        <PriceTicker />
      </div>
      <NotificationBell />
      <ConnectionBadge />
      {user && (
        <div className="flex shrink-0 items-center gap-2 border-l border-line-hairline pl-4 text-xs">
          <div className="flex flex-col items-end leading-tight">
            <span className="font-medium text-ink-primary">{user.displayName}</span>
            <span className="text-[10px] text-ink-muted">{ROLE_LABEL[user.role] ?? user.role}</span>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-md border border-line-hairline px-2 py-1 text-[11px] text-ink-secondary hover:text-ink-primary"
          >
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}
