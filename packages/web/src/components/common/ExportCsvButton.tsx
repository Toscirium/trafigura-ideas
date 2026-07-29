import { exportToCsv } from '../../domain/csv.js';

export function ExportCsvButton({
  filename,
  rows,
}: {
  filename: string;
  rows: Record<string, string | number | boolean | null>[];
}) {
  return (
    <button
      type="button"
      onClick={() => exportToCsv(filename, rows)}
      disabled={rows.length === 0}
      className="no-print rounded-md border border-line-hairline px-3 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:border-line-baseline hover:bg-surface-raised hover:text-ink-primary disabled:opacity-40"
    >
      Export CSV
    </button>
  );
}
