'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

export const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    tone?: 'emerald' | 'champagne' | 'danger' | 'info';
  }
>(({ className, value, tone = 'emerald', ...props }, ref) => {
  const fill = {
    emerald: 'bg-gradient-emerald shadow-[0_0_12px_rgba(25,214,143,0.55)]',
    champagne: 'bg-gradient-champagne shadow-[0_0_12px_rgba(233,201,133,0.45)]',
    danger: 'bg-danger shadow-[0_0_12px_rgba(255,92,122,0.45)]',
    info: 'bg-info shadow-[0_0_12px_rgba(92,200,255,0.45)]',
  }[tone];

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn('h-full w-full flex-1 rounded-full transition-transform duration-500 ease-crown', fill)}
        style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export function ProgressRing({
  value,
  size = 56,
  stroke = 4,
  tone = 'emerald',
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: 'emerald' | 'champagne';
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  const strokeColor = tone === 'emerald' ? 'var(--emerald)' : 'var(--champagne)';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular">
        {children ?? `${Math.round(value)}%`}
      </span>
    </div>
  );
}
