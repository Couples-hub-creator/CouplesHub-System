'use client';

import * as React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { signIn } from 'next-auth/react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { BrandLockup } from '@/components/brand/logo';
import { DiscordIcon } from '@/components/brand/discord-icon';
import { Button } from '@/components/ui/Button';
import { Aurora } from '@/components/motion/primitives';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';

const GemScene = dynamic(() => import('@/components/three/gem-scene'), { ssr: false });

const STATEMENTS = [
  { title: 'Music that never drops', copy: 'A real queue, working filters, and 24/7 channels that stay warm.' },
  { title: 'Moderation with receipts', copy: 'Every action becomes a numbered case you can search later.' },
  { title: 'Community that compounds', copy: 'XP, role rewards and schedules that run without you.' },
];

type Status = 'idle' | 'loading' | 'redirecting';

export function LoginScreen({
  error,
  redirect,
  installed = false,
  detail = null,
}: {
  error: string | null;
  redirect: string;
  installed?: boolean;
  detail?: string | null;
}) {
  const [status, setStatus] = React.useState<Status>('idle');
  const [localError, setLocalError] = React.useState<string | null>(error);
  const [index, setIndex] = React.useState(0);
  const reduced = useReducedMotion();
  const [webgl, setWebgl] = React.useState(false);

  React.useEffect(() => {
    if (reduced) return;
    if (window.innerWidth < 1024) return;
    const id = window.setTimeout(() => setWebgl(true), 400);
    return () => window.clearTimeout(id);
  }, [reduced]);

  React.useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % STATEMENTS.length), 4600);
    return () => window.clearInterval(id);
  }, [reduced]);

  const start = async () => {
    setLocalError(null);
    setStatus('loading');
    try {
      // Brief pause so the button state is perceivable rather than a flicker.
      await new Promise((resolve) => setTimeout(resolve, 260));
      setStatus('redirecting');
      await signIn('discord', { callbackUrl: redirect });
    } catch {
      setStatus('idle');
      setLocalError('We could not reach Discord. Check your connection and try again.');
    }
  };

  const statement = STATEMENTS[index];

  return (
    <div className="relative grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* ── Brand moment ─────────────────────────────────────── */}
      <div className="relative hidden overflow-hidden border-r border-hairline bg-obsidian/40 lg:block">
        <Aurora intensity={1.1} />
        <div aria-hidden className="absolute inset-0 dot-grid opacity-40" />

        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
          <BrandLockup size="lg" />

          <div className="relative mx-auto aspect-square w-full max-w-[30rem]">
            {webgl ? (
              <GemScene className="absolute inset-0" />
            ) : (
              <div aria-hidden className="absolute inset-0 grid place-items-center">
                <div className="relative size-[60%]">
                  <div className="absolute inset-0 rounded-[38%] bg-gradient-to-br from-emerald/25 via-emerald-teal/15 to-transparent blur-2xl" />
                  <div className="absolute inset-[18%] rotate-45 rounded-[30%] border border-emerald/30 bg-emerald/10 backdrop-blur-md" />
                  <div className="absolute inset-[32%] rotate-12 rounded-[26%] border border-champagne/30 bg-champagne/10" />
                </div>
              </div>
            )}
          </div>

          <div className="min-h-[7rem]">
            <AnimatePresence mode="wait">
              <motion.div
                key={statement.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <h2 className="max-w-[22ch] font-display text-2xl font-semibold text-mist">
                  {statement.title}
                </h2>
                <p className="mt-2 max-w-[38ch] text-sm leading-relaxed text-mist-dim">
                  {statement.copy}
                </p>
              </motion.div>
            </AnimatePresence>

            <div className="mt-5 flex gap-1.5" aria-hidden>
              {STATEMENTS.map((item, i) => (
                <span
                  key={item.title}
                  className={cn(
                    'h-1 rounded-full transition-all duration-500',
                    i === index ? 'w-7 bg-emerald' : 'w-3 bg-white/15',
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Form ─────────────────────────────────────────────── */}
      <div className="relative flex flex-col">
        <div className="flex items-center justify-between p-5 lg:justify-end">
          <div className="lg:hidden">
            <BrandLockup />
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-sm text-sm text-mist-dim transition-colors hover:text-mist"
          >
            <ArrowLeft className="size-3.5" />
            Back to site
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-16">
          <div className="w-full max-w-[25rem]">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="glass-raised grain relative overflow-hidden rounded-lg p-6 sm:p-7"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-emerald/10 blur-3xl"
              />

              <div className="relative">
                <h1 className="font-display text-2xl font-semibold text-mist">Sign in to Capital</h1>
                <p className="mt-1.5 text-sm leading-relaxed text-mist-dim">
                  Use the Discord account that manages your server. We never see your password.
                </p>

                {installed && !localError && (
                  <div
                    role="status"
                    className="mt-4 flex items-start gap-2.5 rounded-md border border-emerald/25 bg-emerald/[0.07] px-3 py-2.5"
                  >
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald" />
                    <div>
                      <p className="text-xs font-semibold text-mist">Capital is in your server.</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-mist-dim">
                        Sign in with Discord to open its dashboard.
                      </p>
                    </div>
                  </div>
                )}

                {localError && (
                  <div
                    role="alert"
                    className="mt-4 flex items-start gap-2.5 rounded-md border border-danger/25 bg-danger/[0.07] px-3 py-2.5"
                  >
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" />
                    <div>
                      <p className="text-xs leading-relaxed text-mist">{localError}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setLocalError(null);
                          void start();
                        }}
                        className="mt-1 cursor-pointer text-xs font-semibold text-danger underline-offset-4 hover:underline"
                      >
                        Try again
                      </button>
                      {detail && (
                        <p className="mt-1 break-words font-mono text-[10px] leading-relaxed text-mist-faint">
                          {detail}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <Button
                  variant="discord"
                  size="lg"
                  onClick={start}
                  disabled={status !== 'idle'}
                  className="mt-5 w-full"
                >
                  {status === 'idle' ? (
                    <>
                      <DiscordIcon className="size-5" />
                      Continue with Discord
                    </>
                  ) : (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {status === 'loading' ? 'Opening Discord…' : 'Redirecting…'}
                    </>
                  )}
                </Button>

                <div className="mt-4 flex items-start gap-2 rounded-md border border-hairline bg-white/[0.02] px-3 py-2.5">
                  <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald" />
                  <p className="text-[11px] leading-relaxed text-mist-faint">
                    We request your identity and your server list. We cannot read your messages, and we
                    never ask for a password.
                  </p>
                </div>

                <p className="mt-5 text-center text-[11px] leading-relaxed text-mist-faint">
                  By continuing you agree to the{' '}
                  <Link href="/terms" className="text-mist-dim underline-offset-2 hover:underline">
                    Terms
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-mist-dim underline-offset-2 hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>
            </motion.div>

            <p className="mt-5 text-center text-xs text-mist-faint">
              No server yet?{' '}
              <a
                href={siteConfig.links.invite}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-emerald underline-offset-4 hover:underline"
              >
                Add Capital to Discord
              </a>{' '}
              first.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
