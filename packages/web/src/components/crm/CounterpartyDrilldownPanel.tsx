import * as Dialog from '@radix-ui/react-dialog';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import type { Counterparty, CounterpartyProfile, KycStatus, Trade, TradeConfirmation, Voyage } from 'shared';
import { useMarketStore } from '../../store/useMarketStore.js';
import { useSchedulingStore } from '../../store/useSchedulingStore.js';
import { useCrmStore } from '../../store/useCrmStore.js';
import { formatCurrency } from '../../domain/selectors.js';
import { formatDateTime } from '../../domain/scheduling.js';
import { KYC_LABEL } from '../../domain/crm.js';
import { UtilizationBar } from './UtilizationBar.js';

interface Row {
  counterparty: Counterparty;
  profile: CounterpartyProfile | undefined;
  exposureUsd: number;
  pct: number;
  openVoyages: number;
  openBreaks: number;
}

interface CounterpartyDrilldownPanelProps {
  row: Row | null;
  trades: Trade[];
  voyages: Voyage[];
  confirmations: TradeConfirmation[];
  onClose: () => void;
}

export function CounterpartyDrilldownPanel({ row, trades, voyages, confirmations, onClose }: CounterpartyDrilldownPanelProps) {
  return (
    <Dialog.Root open={row !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed right-0 top-0 flex h-screen w-full max-w-xl flex-col gap-4 overflow-y-auto border-l border-line-hairline bg-surface-card p-6 shadow-xl">
          {row && <PanelBody row={row} trades={trades} voyages={voyages} confirmations={confirmations} />}
          <Dialog.Close asChild>
            <button
              type="button"
              className="mt-auto rounded-md border border-line-hairline py-2 text-xs font-medium text-ink-secondary hover:text-ink-primary"
            >
              Close
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PanelBody({ row, trades, voyages, confirmations }: Omit<CounterpartyDrilldownPanelProps, 'onClose'> & { row: Row }) {
  const desks = useMarketStore((s) => s.desks);
  const commodities = useMarketStore((s) => s.commodities);
  const ports = useSchedulingStore((s) => s.ports);
  const contacts = useCrmStore((s) => s.contacts[row.counterparty.id] ?? []);
  const notes = useCrmStore((s) => s.notes[row.counterparty.id] ?? []);
  const updateProfile = useCrmStore((s) => s.updateProfile);
  const addNote = useCrmStore((s) => s.addNote);
  const addContact = useCrmStore((s) => s.addContact);
  const removeContact = useCrmStore((s) => s.removeContact);

  const cpId = row.counterparty.id;
  const cpTrades = trades.filter((t) => t.counterpartyId === cpId).slice().reverse().slice(0, 10);
  const cpVoyages = voyages.filter((v) => v.counterpartyId === cpId && v.status !== 'completed');
  const cpBreaks = confirmations.filter(
    (c) => c.extracted.counterpartyId === cpId && c.status !== 'matched' && !c.resolved,
  );
  const sortedNotes = notes.slice().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return (
    <>
      <div className="flex items-center justify-between">
        <Dialog.Title className="text-sm font-semibold text-ink-primary">{row.counterparty.name}</Dialog.Title>
        {row.profile && <KycBadge status={row.profile.kycStatus} />}
      </div>
      <Dialog.Description className="text-xs text-ink-muted">
        Tier {row.counterparty.tier} · {row.counterparty.region}
      </Dialog.Description>

      <Section title="Credit exposure">
        <div className="flex items-center justify-between text-xs">
          <span className="text-ink-secondary">
            {formatCurrency(row.exposureUsd)} of {row.profile ? formatCurrency(row.profile.creditLimitUsd) : '—'}
          </span>
        </div>
        <UtilizationBar pct={row.pct} />
        {row.pct >= 1 && (
          <div className="rounded-md border border-status-loss/40 bg-status-loss/10 px-2 py-1.5 text-[11px] text-status-loss">
            Over limit — new trades against this counterparty will be blocked unless overridden.
          </div>
        )}
      </Section>

      {row.profile && <ProfileEditor profile={row.profile} onSave={(patch) => updateProfile(cpId, patch)} />}

      <Section title={`Deal history (${cpTrades.length} recent)`}>
        {cpTrades.length === 0 && <EmptyRow label="No trades yet." />}
        {cpTrades.map((t) => (
          <div key={t.id} className="flex items-center justify-between text-xs">
            <span className="font-sans text-ink-secondary">{new Date(t.timestamp).toLocaleString()}</span>
            <span className="font-mono">
              <span className={t.side === 'BUY' ? 'text-status-gain' : 'text-status-loss'}>{t.side}</span>{' '}
              {t.volume.toLocaleString()} {commodities.find((c) => c.id === t.commodityId)?.name ?? t.commodityId} @{' '}
              {t.price.toFixed(2)}
            </span>
          </div>
        ))}
      </Section>

      <Section title={`Open voyages (${cpVoyages.length})`}>
        {cpVoyages.length === 0 && <EmptyRow label="No open voyages." />}
        {cpVoyages.map((v) => (
          <div key={v.id} className="flex items-center justify-between text-xs">
            <span className="font-sans text-ink-secondary">
              {ports.find((p) => p.id === v.loadPortId)?.name ?? v.loadPortId} →{' '}
              {ports.find((p) => p.id === v.dischargePortId)?.name ?? v.dischargePortId}
            </span>
            <span className="font-mono">{formatCurrency(v.voyagePnlUsd)}</span>
          </div>
        ))}
      </Section>

      <Section title={`Outstanding breaks (${cpBreaks.length})`}>
        {cpBreaks.length === 0 && <EmptyRow label="Nothing outstanding." />}
        {cpBreaks.map((c) => (
          <div key={c.id} className="flex items-center justify-between text-xs">
            <span className="font-sans text-ink-secondary">{formatDateTime(c.receivedAt)}</span>
            <span
              className={clsx('font-mono uppercase', c.status === 'unmatched' ? 'text-status-loss' : 'text-desk-lng')}
            >
              {c.status}
            </span>
          </div>
        ))}
      </Section>

      <ContactsSection
        contacts={contacts}
        onAdd={(input) => addContact(cpId, input)}
        onRemove={(contactId) => removeContact(cpId, contactId)}
      />

      <NotesSection notes={sortedNotes} onAdd={(input) => addNote(cpId, input)} />

      <div className="text-[11px] text-ink-muted">
        Relationship owner: {row.profile?.relationshipOwner ?? '—'} · Desks:{' '}
        {desks.map((d) => d.name).join(', ')}
      </div>
    </>
  );
}

function ProfileEditor({
  profile,
  onSave,
}: {
  profile: CounterpartyProfile;
  onSave: (patch: { creditLimitUsd: number; kycStatus: KycStatus; kycRenewalDate: string; relationshipOwner: string }) => void;
}) {
  const [creditLimitUsd, setCreditLimitUsd] = useState(profile.creditLimitUsd);
  const [kycStatus, setKycStatus] = useState<KycStatus>(profile.kycStatus);
  const [kycRenewalDate, setKycRenewalDate] = useState(profile.kycRenewalDate.slice(0, 10));
  const [relationshipOwner, setRelationshipOwner] = useState(profile.relationshipOwner);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setCreditLimitUsd(profile.creditLimitUsd);
    setKycStatus(profile.kycStatus);
    setKycRenewalDate(profile.kycRenewalDate.slice(0, 10));
    setRelationshipOwner(profile.relationshipOwner);
    setDirty(false);
  }, [profile]);

  return (
    <Section title="Profile">
      <div className="grid grid-cols-2 gap-3 text-xs">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-ink-muted">Credit limit (USD)</span>
          <input
            type="number"
            value={creditLimitUsd}
            onChange={(e) => {
              setCreditLimitUsd(Number(e.target.value));
              setDirty(true);
            }}
            className="rounded border border-line-hairline bg-surface-page px-2 py-1.5 font-mono text-ink-primary"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-ink-muted">KYC status</span>
          <select
            value={kycStatus}
            onChange={(e) => {
              setKycStatus(e.target.value as KycStatus);
              setDirty(true);
            }}
            className="rounded border border-line-hairline bg-surface-page px-2 py-1.5 text-ink-primary"
          >
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
            <option value="expired">Expired</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-ink-muted">KYC renewal date</span>
          <input
            type="date"
            value={kycRenewalDate}
            onChange={(e) => {
              setKycRenewalDate(e.target.value);
              setDirty(true);
            }}
            className="rounded border border-line-hairline bg-surface-page px-2 py-1.5 text-ink-primary"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-ink-muted">Relationship owner</span>
          <input
            type="text"
            value={relationshipOwner}
            onChange={(e) => {
              setRelationshipOwner(e.target.value);
              setDirty(true);
            }}
            className="rounded border border-line-hairline bg-surface-page px-2 py-1.5 text-ink-primary"
          />
        </label>
      </div>
      <button
        type="button"
        disabled={!dirty}
        onClick={() => {
          onSave({
            creditLimitUsd,
            kycStatus,
            kycRenewalDate: new Date(kycRenewalDate).toISOString(),
            relationshipOwner,
          });
          setDirty(false);
        }}
        className="mt-1 w-fit rounded-md bg-desk-crude px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
      >
        Save changes
      </button>
    </Section>
  );
}

function ContactsSection({
  contacts,
  onAdd,
  onRemove,
}: {
  contacts: { id: string; name: string; role: string; email: string; phone: string }[];
  onAdd: (input: { name: string; role: string; email: string; phone: string }) => void;
  onRemove: (contactId: string) => void;
}) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  return (
    <Section title={`Contacts (${contacts.length})`}>
      {contacts.map((c) => (
        <div key={c.id} className="flex items-center justify-between text-xs">
          <div>
            <div className="font-sans text-ink-primary">{c.name}</div>
            <div className="font-sans text-ink-muted">
              {c.role} · {c.email} · {c.phone}
            </div>
          </div>
          <button type="button" onClick={() => onRemove(c.id)} className="text-ink-muted hover:text-status-loss">
            Remove
          </button>
        </div>
      ))}
      <div className="mt-1 grid grid-cols-2 gap-2">
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border border-line-hairline bg-surface-page px-2 py-1 text-xs text-ink-primary placeholder:text-ink-muted"
        />
        <input
          placeholder="Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded border border-line-hairline bg-surface-page px-2 py-1 text-xs text-ink-primary placeholder:text-ink-muted"
        />
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border border-line-hairline bg-surface-page px-2 py-1 text-xs text-ink-primary placeholder:text-ink-muted"
        />
        <input
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="rounded border border-line-hairline bg-surface-page px-2 py-1 text-xs text-ink-primary placeholder:text-ink-muted"
        />
      </div>
      <button
        type="button"
        disabled={!name || !role}
        onClick={() => {
          onAdd({ name, role, email, phone });
          setName('');
          setRole('');
          setEmail('');
          setPhone('');
        }}
        className="w-fit rounded-md border border-line-hairline px-3 py-1.5 text-xs font-medium text-ink-secondary hover:text-ink-primary disabled:opacity-40"
      >
        + Add contact
      </button>
    </Section>
  );
}

function NotesSection({
  notes,
  onAdd,
}: {
  notes: { id: string; author: string; body: string; createdAt: string }[];
  onAdd: (input: { author: string; body: string }) => void;
}) {
  const [author, setAuthor] = useState('');
  const [body, setBody] = useState('');

  return (
    <Section title={`Activity (${notes.length})`}>
      <div className="flex max-h-40 flex-col gap-2 overflow-y-auto">
        {notes.length === 0 && <EmptyRow label="No notes yet." />}
        {notes.map((n) => (
          <div key={n.id} className="rounded bg-surface-page p-2 text-xs">
            <div className="mb-0.5 flex items-center justify-between font-sans text-ink-muted">
              <span>{n.author}</span>
              <span>{formatDateTime(n.createdAt)}</span>
            </div>
            <div className="text-ink-secondary">{n.body}</div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex flex-col gap-2">
        <input
          placeholder="Your name"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="rounded border border-line-hairline bg-surface-page px-2 py-1 text-xs text-ink-primary placeholder:text-ink-muted"
        />
        <textarea
          placeholder="Add a note…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          className="rounded border border-line-hairline bg-surface-page px-2 py-1 text-xs text-ink-primary placeholder:text-ink-muted"
        />
        <button
          type="button"
          disabled={!author || !body}
          onClick={() => {
            onAdd({ author, body });
            setBody('');
          }}
          className="w-fit rounded-md border border-line-hairline px-3 py-1.5 text-xs font-medium text-ink-secondary hover:text-ink-primary disabled:opacity-40"
        >
          + Add note
        </button>
      </div>
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-line-hairline p-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">{title}</div>
      {children}
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return <div className="font-sans text-xs text-ink-muted">{label}</div>;
}

function KycBadge({ status }: { status: KycStatus }) {
  return (
    <span
      className={clsx(
        'rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        status === 'verified' && 'bg-status-gain/15 text-status-gain',
        status === 'pending' && 'bg-desk-lng/15 text-desk-lng',
        status === 'expired' && 'bg-status-loss/15 text-status-loss',
      )}
    >
      {KYC_LABEL[status]}
    </span>
  );
}
