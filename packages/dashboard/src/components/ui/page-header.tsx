import * as React from 'react';
import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  description,
  action,
  icon,
  className,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn('flex flex-col gap-4 border-b border-hairline pb-5 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="flex items-start gap-3">
        {icon && <span className="gem mt-0.5 size-10 shrink-0 [&_svg]:size-5">{icon}</span>}
        <div className="min-w-0">
          <h1 className="text-title-1 font-semibold text-mist">{title}</h1>
          {description && <p className="mt-1 max-w-prose text-sm leading-relaxed text-mist-dim">{description}</p>}
          {children}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
