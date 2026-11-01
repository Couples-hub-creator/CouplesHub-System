'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, error, ...props }, ref) => (
  <div className="w-full">
    <input
      ref={ref}
      aria-invalid={error ? true : undefined}
      className={cn(
        'flex h-10 w-full rounded-md border border-hairline bg-obsidian/60 px-3 text-sm text-mist placeholder:text-mist-faint transition-colors duration-200 focus-visible:border-emerald/50 disabled:cursor-not-allowed disabled:opacity-50',
        error && 'border-danger/60',
        className,
      )}
      {...props}
    />
    {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
  </div>
));
Input.displayName = 'Input';

export { Input };
