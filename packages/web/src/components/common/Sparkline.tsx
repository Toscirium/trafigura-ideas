interface SparklineProps {
  data: number[];
  status: 'gain' | 'loss' | 'neutral';
  width?: number;
  height?: number;
}

const STATUS_COLOR: Record<SparklineProps['status'], string> = {
  gain: '#0ca30c',
  loss: '#d03b3b',
  neutral: '#898781',
};

export function Sparkline({ data, status, width = 96, height = 28 }: SparklineProps) {
  if (data.length < 2) {
    return <svg width={width} height={height} aria-hidden />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * height;
    return [x, y] as const;
  });

  const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [lastX, lastY] = points[points.length - 1]!;

  return (
    <svg width={width} height={height} aria-hidden className="overflow-visible">
      <path d={path} fill="none" stroke="#898781" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r={4} fill={STATUS_COLOR[status]} stroke="#1a1a19" strokeWidth={2} />
    </svg>
  );
}
