import { ConnectionBadge } from '../common/ConnectionBadge.js';
import { PriceTicker } from '../common/PriceTicker.js';
import { NotificationBell } from './NotificationBell.js';
import { Logo } from '../common/Logo.js';
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
    <header className="no-print flex h-14 shrink-0 items-center gap-5 border-b border-line-hairline bg-surface-page/95 px-4 backdrop-blur">
      <Logo size="sm" className="shrink-0" />
      <div className="h-6 w-px shrink-0 bg-line-hairline" aria-hidden />
      <div className="min-w-0 flex-1">
        <PriceTicker />
      </div>
      <NotificationBell />
      <ConnectionBadge />
      {user && (
        <div className="flex shrink-0 items-center gap-3 border-l border-line-hairline pl-4 text-xs">
          <div className="flex flex-col items-end leading-tight">
            <span className="font-medium text-ink-primary">{user.displayName}</span>
            <span className="text-[10px] uppercase tracking-wide text-ink-muted">{ROLE_LABEL[user.role] ?? user.role}</span>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-md border border-line-hairline px-2.5 py-1.5 text-[11px] font-medium text-ink-secondary transition-colors hover:border-line-baseline hover:text-ink-primary"
          >
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}
