import clsx from 'clsx';

const SIZE_PX: Record<'sm' | 'md' | 'lg', number> = { sm: 20, md: 28, lg: 40 };

/** Abstract meridian-ring mark: globe outline bisected by an equator and a longitude arc. */
export function LogoMark({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const px = SIZE_PX[size];
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 32 32"
      fill="none"
      className={clsx('shrink-0', className)}
      aria-hidden
    >
      <circle cx="16" cy="16" r="13" stroke="currentColor" strokeOpacity="0.9" strokeWidth="1.6" />
      <ellipse cx="16" cy="16" rx="5.2" ry="13" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.3" />
      <line x1="3" y1="16" x2="29" y2="16" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.3" />
      <circle cx="16" cy="16" r="2.1" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={clsx('font-semibold uppercase tracking-[0.16em] text-ink-primary', className)}>
      Meridian
    </span>
  );
}

export function Logo({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <div className={clsx('flex items-center gap-2.5 text-brand', className)}>
      <LogoMark size={size} />
      <Wordmark />
    </div>
  );
}
