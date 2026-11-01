'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'relative inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-200 ease-crown focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald/60 focus-visible:ring-offset-2 focus-visible:ring-offset-void disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.985]',
  {
    variants: {
      variant: {
        primary:
          'bg-gradient-emerald text-[#04120C] shadow-glow-sm hover:shadow-glow hover:-translate-y-px active:translate-y-0',
        champagne:
          'bg-gradient-champagne text-[#1A1204] font-bold shadow-glow-champagne hover:-translate-y-px',
        outline:
          'border border-hairline bg-white/[0.02] text-mist hover:border-emerald/40 hover:bg-white/[0.05]',
        ghost: 'text-mist-dim hover:bg-white/[0.05] hover:text-mist',
        subtle: 'bg-obsidian-raised text-mist border border-hairline hover:border-white/15',
        danger: 'border border-danger/30 bg-danger/12 text-danger hover:bg-danger/20',
        discord: 'bg-discord text-white shadow-lift hover:bg-[#4752C4]',
        link: 'text-emerald underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        sm: 'h-8 rounded-sm px-3 text-xs',
        md: 'h-10 rounded-sm px-4 text-sm',
        lg: 'h-12 rounded-md px-6 text-[15px]',
        xl: 'h-14 rounded-md px-8 text-base',
        icon: 'size-9 rounded-sm',
        'icon-sm': 'size-8 rounded-sm',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, asChild, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading && <Loader2 className="animate-spin" aria-hidden />}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
