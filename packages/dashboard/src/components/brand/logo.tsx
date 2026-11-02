import * as React from 'react';
import { cn } from '@/lib/utils';
import { siteConfig } from '@/config/site';

/**
 * The Couples Hub mark: a faceted crown built from three chevrons and a
 * gemstone base. Geometric, not clip-art. Renders crisply at 16px.
 */
export function CrownMark({ className, animated = false }: { className?: string; animated?: boolean }) {
  const id = React.useId().replace(/:/g, '');
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={cn('size-6', className)}
    >
      <defs>
        <linearGradient id={`${id}-crown`} x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#19D68F" />
          <stop offset="1" stopColor="#14B8A6" />
        </linearGradient>
        <linearGradient id={`${id}-gem`} x1="16" y1="18" x2="16" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E9C985" />
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      <path
        d="M4.6 9.4 8.9 13 12.6 5.6a3.6 3.6 0 0 1 6.8 0L23.1 13l4.3-3.6a2 2 0 0 1 3.2 2l-2.9 12.1A3 3 0 0 1 24.8 26H7.2a3 3 0 0 1-2.9-2.5L1.4 11.4a2 2 0 0 1 3.2-2Z"
        fill={`url(#${id}-crown)`}
        className={animated ? 'origin-center transition-transform duration-500 ease-crown group-hover:-translate-y-0.5' : undefined}
      />
      <path d="M13.2 21h5.6l-2.8 6-2.8-6Z" fill={`url(#${id}-gem)`} />
      <path
        d="M4.6 9.4 8.9 13l1.6-3.3L4.6 9.4ZM27.4 9.4 23.1 13l-1.6-3.3 5.9-.3Z"
        fill="#05070C"
        fillOpacity="0.28"
      />
    </svg>
  );
}

export function BrandLockup({
  className,
  showWordmark = true,
  href = '/',
  size = 'md',
}: {
  className?: string;
  showWordmark?: boolean;
  href?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const markSize = { sm: 'size-7', md: 'size-8', lg: 'size-10' }[size];
  const textSize = { sm: 'text-sm', md: 'text-[15px]', lg: 'text-lg' }[size];

  return (
    <a
      href={href}
      className={cn('group inline-flex items-center gap-2.5 rounded-sm', className)}
      aria-label={`${siteConfig.name} home`}
    >
      <span
        className={cn(
          'relative grid place-items-center rounded-[10px] border border-emerald/25 bg-emerald-deep/15 shadow-glow-xs transition-shadow duration-300 group-hover:shadow-glow-sm',
          markSize,
        )}
      >
        <CrownMark className="size-[70%]" animated />
      </span>
      {showWordmark && (
        <span className={cn('whitespace-nowrap font-display font-semibold tracking-[-0.02em] text-mist', textSize)}>
          {siteConfig.name}
        </span>
      )}
    </a>
  );
}
