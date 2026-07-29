/** Converts an array of flat objects into a CSV file and triggers a browser download. */
export function exportToCsv(filename: string, rows: Record<string, string | number | boolean | null>[]): void {
  if (rows.length === 0) return;

  const columns = Object.keys(rows[0]!);
  const escape = (value: unknown): string => {
    const str = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const lines = [columns.join(','), ...rows.map((row) => columns.map((c) => escape(row[c])).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
