import clsx from 'clsx';

export type GroupKey = 'deskName' | 'commodityName' | 'counterpartyName';

const OPTIONS: { key: GroupKey; label: string }[] = [
  { key: 'deskName', label: 'Desk' },
  { key: 'commodityName', label: 'Commodity' },
  { key: 'counterpartyName', label: 'Counterparty' },
];

export function GroupToggle({ value, onChange }: { value: GroupKey; onChange: (key: GroupKey) => void }) {
  return (
    <div className="inline-flex rounded-md border border-line-hairline bg-surface-card p-1 text-xs">
      {OPTIONS.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={clsx(
            'rounded px-3 py-1.5 font-medium transition-colors',
            value === opt.key ? 'bg-line-hairline text-ink-primary' : 'text-ink-secondary hover:text-ink-primary',
          )}
        >
          Group by {opt.label}
        </button>
      ))}
    </div>
  );
}
