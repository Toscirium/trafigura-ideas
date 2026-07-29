import clsx from 'clsx';
import { formatCurrency } from '../../domain/selectors.js';
import { FlashValue } from './FlashValue.js';

export function PnlText({ value, flash = true }: { value: number; flash?: boolean }) {
  const content = (
    <span className={clsx('font-mono tabular-nums', value >= 0 ? 'text-status-gain' : 'text-status-loss')}>
      {formatCurrency(value)}
    </span>
  );

  return flash ? <FlashValue value={value}>{content}</FlashValue> : content;
}
