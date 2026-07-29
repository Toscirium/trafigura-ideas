import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import {
  Gauge,
  TrendingUp,
  Ship,
  GitCompareArrows,
  Building2,
  FileText,
  Landmark,
  ShieldCheck,
  ScrollText,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore.js';
import { navLinksForRole } from '../../domain/access.js';

const NAV_ICON: Record<string, LucideIcon> = {
  '/exposure': Gauge,
  '/pnl': TrendingUp,
  '/scheduling': Ship,
  '/reconciliation': GitCompareArrows,
  '/counterparties': Building2,
  '/documents': FileText,
  '/settlement': Landmark,
  '/compliance': ShieldCheck,
  '/audit': ScrollText,
};

export function SideNav() {
  const role = useAuthStore((s) => s.user?.role);
  const links = role ? navLinksForRole(role) : [];

  return (
    <nav className="no-print flex w-52 shrink-0 flex-col gap-0.5 border-r border-line-hairline bg-surface-page p-3">
      {links.map((link) => {
        const Icon = NAV_ICON[link.to];
        return (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              clsx(
                'group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors',
                isActive ? 'bg-surface-raised text-ink-primary' : 'text-ink-secondary hover:bg-surface-card hover:text-ink-primary',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={clsx(
                    'absolute -left-3 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-brand transition-opacity',
                    isActive ? 'opacity-100' : 'opacity-0',
                  )}
                  aria-hidden
                />
                {Icon && (
                  <Icon
                    size={16}
                    strokeWidth={2}
                    className={clsx('shrink-0', isActive ? 'text-brand' : 'text-ink-muted group-hover:text-ink-secondary')}
                  />
                )}
                {link.label}
              </>
            )}
          </NavLink>
        );
      })}

      <div className="mt-auto flex flex-col gap-0.5 border-t border-line-hairline px-3 pt-3 text-[10px] text-ink-muted">
        <span>Meridian</span>
        <span>Desk simulation build</span>
      </div>
    </nav>
  );
}
