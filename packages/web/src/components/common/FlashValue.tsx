import { useEffect, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';

interface FlashValueProps {
  value: number;
  children: ReactNode;
  className?: string;
}

/** Wraps a cell and briefly flashes its background gain/loss-colored when `value` changes. */
export function FlashValue({ value, children, className }: FlashValueProps) {
  const prevValue = useRef(value);
  const [flash, setFlash] = useState<'gain' | 'loss' | null>(null);

  useEffect(() => {
    if (value !== prevValue.current) {
      setFlash(value > prevValue.current ? 'gain' : 'loss');
      prevValue.current = value;
      const timeout = setTimeout(() => setFlash(null), 450);
      return () => clearTimeout(timeout);
    }
  }, [value]);

  return (
    <span
      className={clsx(
        'inline-block rounded px-1 transition-colors duration-[450ms] motion-reduce:transition-none',
        flash === 'gain' && 'bg-status-gain/15',
        flash === 'loss' && 'bg-status-loss/15',
        className,
      )}
    >
      {children}
    </span>
  );
}
