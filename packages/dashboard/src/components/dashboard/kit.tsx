'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import * as Select from '@radix-ui/react-select';
import * as Popover from '@radix-ui/react-popover';
import { AlertCircle, Check, ChevronDown, Loader2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CountUp } from '@/components/motion/primitives';

/* ── Section card ─────────────────────────────────────────────── */
export function SectionCard({
  title,
  description,
  action,
  icon,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn('rounded-lg border border-hairline bg-obsidian/60', className)}>
      <header className="flex flex-col gap-3 border-b border-hairline px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          {icon && <span className="gem mt-0.5 size-8 [&_svg]:size-4">{icon}</span>}
          <div>
            <h2 className="text-sm font-semibold text-mist">{title}</h2>
            {description && <p className="mt-0.5 text-xs leading-relaxed text-mist-dim">{description}</p>}
          </div>
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </header>
      <div className={cn('p-4', bodyClassName)}>{children}</div>
    </section>
  );
}

/* ── Setting row ──────────────────────────────────────────────── */
export function SettingRow({
  label,
  description,
  children,
  htmlFor,
  className,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6',
        className,
      )}
    >
      <div className="min-w-0">
        <label htmlFor={htmlFor} className="text-sm font-medium text-mist">
          {label}
        </label>
        {description && (
          <p className="mt-0.5 max-w-prose text-xs leading-relaxed text-mist-dim">{description}</p>
        )}
      </div>
      <div className="shrink-0 sm:max-w-[20rem]">{children}</div>
    </div>
  );
}

/* ── KPI card ─────────────────────────────────────────────────── */
export function KpiCard({
  label,
  value,
  suffix,
  delta,
  icon,
  points,
  tone = 'emerald',
}: {
  label: string;
  value: number;
  suffix?: string;
  delta?: { value: number; label: string } | null;
  icon: React.ReactNode;
  points: number[];
  tone?: 'emerald' | 'champagne' | 'info' | 'danger';
}) {
  const stroke = {
    emerald: '#19D68F',
    champagne: '#E9C985',
    info: '#5CC8FF',
    danger: '#FF5C7A',
  }[tone];

  const path = React.useMemo(() => {
    if (points.length < 2) return '';
    const max = Math.max(...points);
    const min = Math.min(...points);
    const span = Math.max(1, max - min);
    return points
      .map((point, index) => {
        const x = (index / (points.length - 1)) * 100;
        const y = 28 - ((point - min) / span) * 24;
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  }, [points]);

  return (
    <div className="group relative overflow-hidden rounded-lg border border-hairline bg-obsidian/60 p-3.5 transition-colors duration-300 hover:border-white/[0.12]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-mist-faint">{label}</p>
        <span className="gem size-7 [&_svg]:size-3.5">{icon}</span>
      </div>

      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="font-display text-2xl font-semibold tabular text-mist">
          <CountUp to={value} />
        </span>
        {suffix && <span className="text-sm text-mist-dim">{suffix}</span>}
      </div>

      {delta && (
        <p
          className={cn(
            'mt-1 text-[11px] font-medium',
            delta.value >= 0 ? 'text-emerald' : 'text-danger',
          )}
        >
          {delta.value >= 0 ? '+' : ''}
          {delta.value}% <span className="font-normal text-mist-faint">{delta.label}</span>
        </p>
      )}

      {points.length > 1 && (
        <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="mt-2 h-8 w-full" aria-hidden>
          <defs>
            <linearGradient id={`kpi-${label.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.3" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${path} L100,30 L0,30 Z`} fill={`url(#kpi-${label.replace(/\s/g, '')})`} />
          <motion.path
            d={path}
            fill="none"
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
      )}
    </div>
  );
}

/* ── Pickers ──────────────────────────────────────────────────── */
interface Option {
  value: string;
  label: string;
}

export function Picker({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  emptyMessage = 'Nothing available',
  loading,
  error,
  id,
  className,
  allowNone,
  noneLabel = 'None',
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  options: Option[];
  placeholder?: string;
  emptyMessage?: string;
  loading?: boolean;
  error?: string | null;
  id?: string;
  className?: string;
  allowNone?: boolean;
  noneLabel?: string;
}) {
  const NONE = '__none__';

  return (
    <div className={className}>
      <Select.Root
        value={value ?? (allowNone ? NONE : undefined)}
        onValueChange={(next) => onChange(next === NONE ? null : next)}
      >
        <Select.Trigger
          id={id}
          className="flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-sm border border-hairline bg-obsidian/60 px-2.5 text-sm text-mist transition-colors hover:border-white/15 focus-visible:border-emerald/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          disabled={loading || Boolean(error)}
        >
          <Select.Value placeholder={loading ? 'Loading…' : placeholder} />
          <Select.Icon>
            {loading ? (
              <Loader2 className="size-3.5 animate-spin text-mist-faint" />
            ) : (
              <ChevronDown className="size-3.5 text-mist-faint" />
            )}
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Content
            position="popper"
            sideOffset={6}
            className="z-[70] max-h-64 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-hairline bg-obsidian-raised shadow-lift-lg"
          >
            <Select.Viewport className="p-1">
              {error ? (
                <p className="px-2 py-2 text-xs leading-relaxed text-warning">{error}</p>
              ) : options.length === 0 ? (
                <p className="px-2 py-2 text-xs text-mist-faint">{emptyMessage}</p>
              ) : (
                <>
                  {allowNone && (
                    <Select.Item
                      value={NONE}
                      className="flex cursor-pointer items-center justify-between rounded-sm px-2 py-1.5 text-sm text-mist-dim outline-none data-[highlighted]:bg-white/[0.06] data-[highlighted]:text-mist"
                    >
                      <Select.ItemText>{noneLabel}</Select.ItemText>
                    </Select.Item>
                  )}
                  {options.map((option) => (
                    <Select.Item
                      key={option.value}
                      value={option.value}
                      className="flex cursor-pointer items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm text-mist-dim outline-none data-[highlighted]:bg-emerald/[0.1] data-[highlighted]:text-mist"
                    >
                      <Select.ItemText>{option.label}</Select.ItemText>
                      <Select.ItemIndicator>
                        <Check className="size-3.5 text-emerald" />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </>
              )}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>

      {error && (
        <p className="mt-1.5 flex items-start gap-1 text-[11px] leading-relaxed text-warning">
          <AlertCircle className="mt-0.5 size-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

/* ── Multi picker (channels, roles, topics) ───────────────────── */
export function MultiPicker({
  values,
  onChange,
  options,
  placeholder = 'Choose…',
  loading,
  error,
  emptyMessage = 'Nothing available',
  max,
  id,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  options: Option[];
  placeholder?: string;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  max?: number;
  id?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [term, setTerm] = React.useState('');

  const selected = values
    .map((value) => options.find((option) => option.value === value) ?? { value, label: value })
    .filter(Boolean);

  const filtered = options.filter((option) =>
    option.label.toLowerCase().includes(term.trim().toLowerCase()),
  );

  const toggle = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter((item) => item !== value));
      return;
    }
    if (max && values.length >= max) return;
    onChange([...values, value]);
  };

  return (
    <div>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            id={id}
            type="button"
            disabled={loading || Boolean(error)}
            className="flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-sm border border-hairline bg-obsidian/60 px-2.5 py-1.5 text-left text-sm text-mist transition-colors hover:border-white/15 focus-visible:border-emerald/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="min-w-0 flex-1 truncate text-mist-dim">
              {loading
                ? 'Loading…'
                : selected.length === 0
                  ? placeholder
                  : `${selected.length} selected`}
            </span>
            <ChevronDown className="size-3.5 shrink-0 text-mist-faint" />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            sideOffset={6}
            align="end"
            className="z-[70] w-[min(20rem,calc(100vw-2rem))] rounded-md border border-hairline bg-obsidian-raised p-2 shadow-lift-lg"
          >
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-mist-faint" />
              <input
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Search"
                className="h-8 w-full rounded-sm border border-hairline bg-void/60 pl-7 pr-2 text-xs text-mist placeholder:text-mist-faint focus-visible:border-emerald/50 focus-visible:outline-none"
              />
            </div>

            <div className="max-h-56 overflow-y-auto pr-0.5">
              {error ? (
                <p className="px-2 py-2 text-xs leading-relaxed text-warning">{error}</p>
              ) : filtered.length === 0 ? (
                <p className="px-2 py-2 text-xs text-mist-faint">{emptyMessage}</p>
              ) : (
                filtered.map((option) => {
                  const checked = values.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggle(option.value)}
                      className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs text-mist-dim transition-colors hover:bg-white/[0.05] hover:text-mist"
                    >
                      <span
                        className={cn(
                          'grid size-4 shrink-0 place-items-center rounded-[3px] border transition-colors',
                          checked
                            ? 'border-emerald bg-emerald text-void'
                            : 'border-hairline bg-void/40',
                        )}
                      >
                        {checked && <Check className="size-3" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    </button>
                  );
                })
              )}
            </div>

            {selected.length > 0 && (
              <div className="mt-2 flex items-center justify-between border-t border-hairline pt-2">
                <span className="text-[10px] text-mist-faint">
                  {selected.length}
                  {max ? ` / ${max}` : ''} selected
                </span>
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="cursor-pointer text-[10px] font-semibold text-mist-dim hover:text-danger"
                >
                  Clear all
                </button>
              </div>
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {selected.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {selected.map((option) => (
            <span
              key={option.value}
              className="inline-flex items-center gap-1 rounded-full border border-hairline bg-white/[0.04] py-0.5 pl-2 pr-1 text-[10px] text-mist-dim"
            >
              <span className="max-w-32 truncate">{option.label}</span>
              <button
                type="button"
                onClick={() => onChange(values.filter((value) => value !== option.value))}
                aria-label={`Remove ${option.label}`}
                className="cursor-pointer rounded-full p-0.5 text-mist-faint hover:text-danger"
              >
                <X className="size-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-1.5 flex items-start gap-1 text-[11px] leading-relaxed text-warning">
          <AlertCircle className="mt-0.5 size-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

/* ── Inline notice ────────────────────────────────────────────── */export function Notice({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'emerald';
  title?: string;
  children: React.ReactNode;
}) {
  const styles = {
    info: 'border-info/25 bg-info/[0.06] text-info',
    warning: 'border-warning/25 bg-warning/[0.06] text-warning',
    danger: 'border-danger/25 bg-danger/[0.06] text-danger',
    emerald: 'border-emerald/25 bg-emerald/[0.06] text-emerald',
  }[tone];

  return (
    <div className={cn('flex items-start gap-2.5 rounded-md border px-3 py-2.5', styles)}>
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
      <div className="min-w-0">
        {title && <p className="text-xs font-semibold">{title}</p>}
        <p className="text-[11px] leading-relaxed text-mist-dim">{children}</p>
      </div>
    </div>
  );
}

/* ── Form skeleton ────────────────────────────────────────────── */
export function FormSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center justify-between gap-4 py-2">
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3 w-1/3 rounded" />
            <div className="skeleton h-2.5 w-2/3 rounded" />
          </div>
          <div className="skeleton h-8 w-28 rounded" />
        </div>
      ))}
    </div>
  );
}
