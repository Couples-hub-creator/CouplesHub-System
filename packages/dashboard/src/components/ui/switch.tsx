'use client';

import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-hairline bg-obsidian-raised transition-colors duration-200 ease-crown focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-emerald/50 data-[state=checked]:bg-emerald-deep/40',
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        'pointer-events-none block size-4.5 h-[18px] w-[18px] rounded-full bg-mist-faint shadow-md transition-transform duration-200 ease-crown translate-x-[3px] data-[state=checked]:translate-x-[23px] data-[state=checked]:bg-emerald data-[state=checked]:shadow-glow-sm',
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
