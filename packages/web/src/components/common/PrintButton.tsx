export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded-md border border-line-hairline px-3 py-1.5 text-xs font-medium text-ink-secondary hover:text-ink-primary"
    >
      Print / Save PDF
    </button>
  );
}
