'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Server } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center px-4 py-20 text-center">
      <span className="gem-danger flex size-12 items-center justify-center rounded-full border border-danger/25 bg-danger/10 text-danger">
        <AlertTriangle className="size-5" />
      </span>
      <h1 className="mt-5 font-display text-title-1 font-semibold text-mist">
        This panel could not load.
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-mist-dim">
        The dashboard hit an error while fetching this server. Your settings are not lost. Try again, or go
        back to the server list.
      </p>
      {error.digest && <p className="mt-2 font-mono text-[10px] text-mist-faint">Reference {error.digest}</p>}

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>
          <RotateCcw className="size-4" />
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/servers">
            <Server className="size-4" />
            All servers
          </Link>
        </Button>
      </div>
    </div>
  );
}
