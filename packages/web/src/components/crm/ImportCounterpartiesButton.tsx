import { useRef, useState } from 'react';
import type { NewCounterpartyInput } from 'shared';
import { apiFetch } from '../../api/client.js';
import { parseCsv } from '../../domain/csvImport.js';

const VALID_TIERS = new Set(['A', 'B', 'C']);

export function ImportCounterpartiesButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const text = await file.text();
    const rows = parseCsv(text);

    const counterparties: NewCounterpartyInput[] = [];
    for (const row of rows) {
      const name = row.name?.trim();
      const tier = row.tier?.trim().toUpperCase();
      const region = row.region?.trim();
      if (!name || !VALID_TIERS.has(tier ?? '') || !region) continue;
      counterparties.push({ name, tier: tier as NewCounterpartyInput['tier'], region });
    }

    if (counterparties.length === 0) {
      setStatus('No valid rows found. Expect columns: name, tier (A/B/C), region.');
      return;
    }

    const proceed = window.confirm(
      `This replaces the entire counterparty book with ${counterparties.length} counterparties from the file. Continue?`,
    );
    if (!proceed) return;

    setStatus('Importing…');
    const res = await apiFetch('/api/admin/counterparties/import', {
      method: 'POST',
      body: JSON.stringify({ counterparties }),
    });
    setStatus(res.ok ? `Imported ${counterparties.length} counterparties.` : 'Import failed.');
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="no-print rounded-md border border-line-hairline px-3 py-1.5 text-xs font-medium text-ink-secondary hover:text-ink-primary"
      >
        Import CSV
      </button>
      <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
      {status && <span className="text-[11px] text-ink-muted">{status}</span>}
    </div>
  );
}
