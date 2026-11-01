'use client';

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn('relative flex w-full touch-none select-none items-center cursor-pointer', className)}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-obsidian-raised border border-hairline">
      <SliderPrimitive.Range className="absolute h-full bg-gradient-emerald" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      aria-label="Value"
      className="block size-4 rounded-full border border-emerald/60 bg-emerald shadow-glow-sm transition-transform duration-150 ease-crown hover:scale-110 focus-visible:outline-none disabled:pointer-events-none"
    />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
