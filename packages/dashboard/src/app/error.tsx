'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Surface the error in the browser console for whoever is debugging.
    console.error(error);
  }, [error]);

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-void px-gutter py-24">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 dot-grid opacity-30" />
        <div className="aurora-blob left-1/2 top-[-25%] h-[32rem] w-[32rem] -translate-x-1/2 bg-danger/[0.06]" />
      </div>

      <div className="relative z-10 max-w-lg text-center">
        <span className="gem-danger mx-auto flex size-12 items-center justify-center rounded-full border border-danger/25 bg-danger/10 text-danger">
          <AlertTriangle className="size-5" />
        </span>
        <h1 className="mt-5 font-display text-display-3 font-semibold text-mist">
          Something broke on our side.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-mist-dim">
          The page could not finish loading. Try again — if it keeps failing, open the support page with
          what you were doing.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-[10px] text-mist-faint">Reference {error.digest}</p>
        )}

        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <Button onClick={reset}>
            <RotateCcw className="size-4" />
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="size-4" />
              Back home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
