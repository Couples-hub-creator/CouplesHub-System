import * as React from 'react';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.015] text-center',
        compact ? 'gap-2 px-5 py-8' : 'gap-3 px-6 py-14',
        className,
      )}
    >
      {icon && <span className="gem size-11 [&_svg]:size-5">{icon}</span>}
      <h3 className={cn('font-semibold text-mist', compact ? 'text-sm' : 'text-base')}>{title}</h3>
      {description && (
        <p className={cn('max-w-sm leading-relaxed text-mist-dim', compact ? 'text-xs' : 'text-sm')}>{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  retryLabel = 'Try again',
  className,
}: {
  title?: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-start gap-2 rounded-lg border border-danger/25 bg-danger/[0.06] px-4 py-3.5',
        className,
      )}
    >
      <p className="text-sm font-semibold text-mist">{title}</p>
      <p className="text-sm leading-relaxed text-mist-dim">{description}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 text-sm font-semibold text-danger underline-offset-4 hover:underline"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
