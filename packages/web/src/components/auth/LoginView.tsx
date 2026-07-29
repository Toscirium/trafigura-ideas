import { useState } from 'react';
import { Logo, LogoMark } from '../common/Logo.js';
import { useAuthStore } from '../../store/useAuthStore.js';

export function LoginView() {
  const login = useAuthStore((s) => s.login);
  const error = useAuthStore((s) => s.error);
  const submitting = useAuthStore((s) => s.submitting);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await login(username, password);
  }

  return (
    <div className="flex h-screen bg-surface-page">
      <div className="relative hidden w-[42%] shrink-0 flex-col justify-between overflow-hidden border-r border-line-hairline bg-meridian p-10 lg:flex">
        <Logo size="md" />
        <div className="max-w-sm">
          <LogoMark size="lg" className="mb-6 text-brand/40" />
          <h1 className="text-2xl font-semibold leading-snug text-ink-primary">
            Market, credit &amp; operational risk for the trading desk.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
            Exposure, P&amp;L, scheduling, reconciliation, settlement, compliance and document
            intelligence — one live view across the desk.
          </p>
        </div>
        <p className="text-[11px] text-ink-muted">Internal demo environment · simulated market &amp; trade data</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-5">
          <div className="flex flex-col gap-1 lg:hidden">
            <Logo size="md" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-ink-primary">Sign in</h2>
            <p className="mt-1 text-xs text-ink-muted">Use your desk credentials to continue.</p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Username</span>
            <input
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md border border-line-hairline bg-surface-card px-3 py-2 text-sm text-ink-primary outline-none transition-colors focus:border-brand"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-line-hairline bg-surface-card px-3 py-2 text-sm text-ink-primary outline-none transition-colors focus:border-brand"
            />
          </label>

          {error && (
            <div className="rounded-md border border-status-loss/40 bg-status-loss/10 px-3 py-2 text-xs text-status-loss">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting || !username || !password}
            className="rounded-md bg-brand px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="rounded-md border border-line-hairline bg-surface-card p-3 text-[11px] leading-relaxed text-ink-muted">
            Demo accounts: <span className="text-ink-secondary">admin/admin123</span>,{' '}
            <span className="text-ink-secondary">trader/trader123</span>,{' '}
            <span className="text-ink-secondary">compliance/compliance123</span>,{' '}
            <span className="text-ink-secondary">settlements/settlements123</span>,{' '}
            <span className="text-ink-secondary">riskmgr/risk123</span>
          </div>
        </form>
      </div>
    </div>
  );
}
