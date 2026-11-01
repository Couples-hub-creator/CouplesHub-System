import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold leading-none whitespace-nowrap [&_svg]:size-3',
  {
    variants: {
      tone: {
        neutral: 'border-hairline bg-white/[0.04] text-mist-dim',
        emerald: 'border-emerald/25 bg-emerald/10 text-emerald',
        champagne: 'border-champagne/30 bg-champagne/10 text-champagne',
        danger: 'border-danger/30 bg-danger/10 text-danger',
        warning: 'border-warning/30 bg-warning/10 text-warning',
        info: 'border-info/30 bg-info/10 text-info',
      },
      solid: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      { tone: 'emerald', solid: true, className: 'bg-emerald text-void border-emerald' },
      { tone: 'champagne', solid: true, className: 'bg-champagne text-void border-champagne' },
      { tone: 'danger', solid: true, className: 'bg-danger text-void border-danger' },
    ],
    defaultVariants: { tone: 'neutral', solid: false },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, solid, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, solid }), className)} {...props} />;
}

export function StatusDot({
  tone = 'emerald',
  pulse = true,
  className,
}: {
  tone?: 'emerald' | 'danger' | 'warning' | 'info' | 'neutral';
  pulse?: boolean;
  className?: string;
}) {
  const color = {
    emerald: 'bg-emerald shadow-[0_0_10px_rgba(25,214,143,0.8)]',
    danger: 'bg-danger shadow-[0_0_10px_rgba(255,92,122,0.8)]',
    warning: 'bg-warning shadow-[0_0_10px_rgba(255,184,77,0.8)]',
    info: 'bg-info shadow-[0_0_10px_rgba(92,200,255,0.8)]',
    neutral: 'bg-mist-faint',
  }[tone];

  return (
    <span className={cn('relative inline-flex size-2 shrink-0 rounded-full', color, className)}>
      {pulse && <span className={cn('absolute inset-0 rounded-full opacity-60', color, 'animate-ping')} />}
    </span>
  );
}
