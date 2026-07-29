import { useMarketStore } from '../../store/useMarketStore.js';
import { formatCurrency, totalPnl } from '../../domain/selectors.js';
import { useSeries } from '../../domain/useSeries.js';

const WIDTH = 800;
const HEIGHT = 160;
const PADDING = 12;

export function PnlTrendChart() {
  const positions = useMarketStore((s) => s.positions);
  const pnl = totalPnl(Object.values(positions));
  const series = useSeries('firm', pnl, 80);

  const status = pnl >= 0 ? 'gain' : 'loss';
  const color = status === 'gain' ? '#0ca30c' : '#d03b3b';

  if (series.length < 2) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-line-hairline bg-surface-card text-sm text-ink-muted">
        Waiting for P&amp;L history…
      </div>
    );
  }

  const min = Math.min(...series, 0);
  const max = Math.max(...series, 0);
  const range = max - min || 1;
  const innerW = WIDTH - PADDING * 2;
  const innerH = HEIGHT - PADDING * 2;
  const stepX = innerW / (series.length - 1);

  const toY = (v: number) => PADDING + innerH - ((v - min) / range) * innerH;
  const zeroY = toY(0);

  const points = series.map((v, i) => [PADDING + i * stepX, toY(v)] as const);
  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1]![0].toFixed(1)},${zeroY.toFixed(1)} L${points[0]![0].toFixed(1)},${zeroY.toFixed(1)} Z`;

  return (
    <div className="rounded-lg border border-line-hairline bg-surface-card p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-secondary">Firm-wide MTM P&amp;L</span>
        <span className="font-mono text-lg font-semibold" style={{ color }}>
          {formatCurrency(pnl)}
        </span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" preserveAspectRatio="none" aria-hidden>
        <line x1={PADDING} y1={zeroY} x2={WIDTH - PADDING} y2={zeroY} stroke="#383835" strokeWidth={1} />
        <path d={areaPath} fill={color} fillOpacity={0.1} stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
