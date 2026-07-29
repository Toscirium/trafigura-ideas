import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { useAuthStore } from '../../store/useAuthStore.js';
import { navLinksForRole } from '../../domain/access.js';

export function SideNav() {
  const role = useAuthStore((s) => s.user?.role);
  const links = role ? navLinksForRole(role) : [];

  return (
    <nav className="no-print flex w-48 shrink-0 flex-col gap-1 border-r border-line-hairline bg-surface-page p-4">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            clsx(
              'rounded px-3 py-2 text-sm font-medium',
              isActive ? 'bg-surface-card text-ink-primary' : 'text-ink-secondary hover:text-ink-primary',
            )
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
