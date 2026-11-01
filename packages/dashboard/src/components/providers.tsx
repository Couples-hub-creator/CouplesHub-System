'use client';

import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from 'sonner';
import { useState, type ReactNode } from 'react';
import { LenisProvider } from '@/components/motion/lenis-provider';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={200}>
          <LenisProvider>
            {children}
            <Toaster
              theme="dark"
              position="bottom-right"
              toastOptions={{
                style: {
                  background: 'var(--obsidian-raised)',
                  border: '1px solid var(--hairline)',
                  color: 'var(--mist)',
                },
              }}
            />
          </LenisProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
