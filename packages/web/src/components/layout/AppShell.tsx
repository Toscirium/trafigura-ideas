import type { ReactNode } from 'react';
import { TopBar } from './TopBar.js';
import { SideNav } from './SideNav.js';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen flex-col bg-surface-page text-ink-primary">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <SideNav />
        <main className="min-w-0 flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
