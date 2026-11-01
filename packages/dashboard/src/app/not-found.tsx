import Link from 'next/link';
import { ArrowLeft, Compass, Search } from 'lucide-react';
import { BrandLockup } from '@/components/brand/logo';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-void">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 dot-grid opacity-40" />
        <div className="aurora-blob left-1/2 top-[-30%] h-[36rem] w-[36rem] -translate-x-1/2 bg-emerald/[0.08]" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-shell items-center justify-between px-gutter py-6">
        <BrandLockup />
        <Button asChild variant="ghost" size="sm">
          <Link href="/">
            <ArrowLeft className="size-3.5" />
            Home
          </Link>
        </Button>
      </header>

      <main id="main" className="relative z-10 flex flex-1 items-center justify-center px-gutter pb-24">
        <div className="max-w-lg text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-emerald">Error 404</p>
          <h1 className="mt-3 font-display text-display-1 font-semibold text-mist">
            This page left the server.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-mist-dim">
            The link is wrong, the page moved, or it never existed. Nothing is broken on your side.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link href="/">
                <Compass className="size-4" />
                Go home
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/commands">
                <Search className="size-4" />
                Browse commands
              </Link>
            </Button>
          </div>

          <p className="mt-8 text-xs text-mist-faint">
            Looking for the dashboard?{' '}
            <Link href="/servers" className="text-emerald underline-offset-4 hover:underline">
              Open your servers
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
