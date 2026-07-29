import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore.js';
import { canAccess, defaultRouteForRole } from '../../domain/access.js';

export function RoleGuard({ path, children }: { path: string; children: ReactNode }) {
  const role = useAuthStore((s) => s.user?.role);
  if (!role) return null;
  if (!canAccess(role, path)) return <Navigate to={defaultRouteForRole(role)} replace />;
  return <>{children}</>;
}
