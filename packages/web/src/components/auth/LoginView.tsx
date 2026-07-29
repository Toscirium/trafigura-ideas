import { useState } from 'react';
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
    <div className="flex h-screen items-center justify-center bg-surface-page">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-line-hairline bg-surface-card p-8"
      >
        <div className="text-sm font-semibold tracking-wide text-ink-primary">
          VANTAGE <span className="text-ink-muted">RISK</span>
        </div>
        <p className="text-xs text-ink-muted">Sign in to continue.</p>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Username</span>
          <input
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded border border-line-hairline bg-surface-page px-2 py-1.5 text-sm text-ink-primary"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-line-hairline bg-surface-page px-2 py-1.5 text-sm text-ink-primary"
          />
        </label>

        {error && <div className="rounded-md border border-status-loss/40 bg-status-loss/10 px-3 py-2 text-xs text-status-loss">{error}</div>}

        <button
          type="submit"
          disabled={submitting || !username || !password}
          className="rounded-md bg-desk-crude px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="rounded-md border border-line-hairline bg-surface-page p-3 text-[11px] leading-relaxed text-ink-muted">
          Demo accounts: <span className="text-ink-secondary">admin/admin123</span>,{' '}
          <span className="text-ink-secondary">trader/trader123</span>,{' '}
          <span className="text-ink-secondary">compliance/compliance123</span>,{' '}
          <span className="text-ink-secondary">settlements/settlements123</span>,{' '}
          <span className="text-ink-secondary">riskmgr/risk123</span>
        </div>
      </form>
    </div>
  );
}
