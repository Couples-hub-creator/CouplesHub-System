'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Layers, Search, Sparkles } from 'lucide-react';
import { api } from '@/lib/api/client';
import {
  DEDICATED_MODULES,
  modulePageHref,
  type CatalogModule,
  type CatalogResponse,
} from '@/lib/modules/catalog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/dashboard/kit';
import { ModuleIcon } from '@/components/dashboard/module-icon';

const CATEGORY_ORDER = [
  'Engagement',
  'Community',
  'Moderation',
  'Support',
  'Automation',
  'Utility',
  'Music',
  'Fun',
];

function categoryRank(category: string) {
  const index = CATEGORY_ORDER.indexOf(category);
  return index === -1 ? CATEGORY_ORDER.length : index;
}

function Stat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-lg border border-hairline bg-obsidian/60 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-mist-faint">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular text-mist">{value}</p>
      <p className="mt-0.5 text-[11px] text-mist-faint">{hint}</p>
    </div>
  );
}

function ModuleCard({ guildId, entry }: { guildId: string; entry: CatalogModule }) {
  const dedicated = DEDICATED_MODULES[entry.id];
  return (
    <Link
      href={modulePageHref(guildId, entry.id)}
      className="group flex flex-col rounded-lg border border-hairline bg-obsidian/60 p-4 transition-colors hover:border-emerald/30 hover:bg-emerald/[0.02]"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="gem size-9 shrink-0 [&_svg]:size-4">
          <ModuleIcon name={entry.icon} />
        </span>
        <div className="flex flex-wrap justify-end gap-1.5">
          {entry.premium && (
            <Badge tone="champagne">
              <Sparkles className="size-3" />
              PRO
            </Badge>
          )}
          <Badge tone={entry.configured ? 'emerald' : 'neutral'}>
            {entry.configured ? 'Configured' : 'Defaults'}
          </Badge>
        </div>
      </div>

      <h3 className="mt-3 text-sm font-semibold text-mist">{entry.name}</h3>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-mist-dim">{entry.description}</p>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-hairline pt-2.5">
        <span className="text-[10px] uppercase tracking-[0.08em] text-mist-faint">
          {entry.category}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald">
          {dedicated ? 'Open page' : 'Configure'}
          <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

export function ModulesView({ guildId }: { guildId: string }) {
  const [search, setSearch] = React.useState('');
  const catalog = useQuery({
    queryKey: ['modules', guildId],
    queryFn: () => api.get<CatalogResponse>(`/api/guilds/${guildId}/modules`),
    staleTime: 30_000,
    retry: false,
  });

  const modules = React.useMemo(() => catalog.data?.modules ?? [], [catalog.data]);
  const configured = modules.filter((entry) => entry.configured).length;
  const premium = modules.filter((entry) => entry.premium).length;

  const grouped = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = modules.filter((entry) => {
      if (!term) return true;
      return (
        entry.name.toLowerCase().includes(term) ||
        entry.description.toLowerCase().includes(term) ||
        entry.category.toLowerCase().includes(term) ||
        entry.id.includes(term)
      );
    });

    const groups = new Map<string, CatalogModule[]>();
    for (const entry of filtered) {
      const list = groups.get(entry.category) ?? [];
      list.push(entry);
      groups.set(entry.category, list);
    }

    return Array.from(groups.entries()).sort(([a], [b]) => {
      const rank = categoryRank(a) - categoryRank(b);
      return rank !== 0 ? rank : a.localeCompare(b);
    });
  }, [modules, search]);

  const resultCount = grouped.reduce((total, [, entries]) => total + entries.length, 0);

  return (
    <div className="mx-auto w-full max-w-shell space-y-5 pb-16">
      <PageHeader
        title="Modules"
        description="Every feature the bot loads, in one catalog. Open a module to configure it, design its cards or inspect its live data."
        icon={<Layers />}
        action={
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-mist-faint" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search modules"
              aria-label="Search modules"
              className="h-9 w-48 pl-8 text-xs sm:w-64"
            />
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Modules" value={modules.length} hint="Loaded by the bot" />
        <Stat label="Configured" value={configured} hint="Saved for this server" />
        <Stat label="Premium" value={premium} hint="Needs an active plan" />
      </div>

      {catalog.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="skeleton h-44 rounded-lg" />
          ))}
        </div>
      ) : catalog.isError ? (
        <SectionCard title="Module catalog" description="The bot did not return its module list.">
          <ErrorState
            title="Could not load modules"
            description={
              catalog.error instanceof Error ? catalog.error.message : 'Try again in a moment.'
            }
            onRetry={() => void catalog.refetch()}
          />
        </SectionCard>
      ) : resultCount === 0 ? (
        <EmptyState
          icon={<Layers />}
          title="No module matches that search"
          description="Try the module name, its category or a word from its description."
          action={
            <button
              type="button"
              onClick={() => setSearch('')}
              className="cursor-pointer text-sm font-semibold text-emerald underline-offset-4 hover:underline"
            >
              Clear the search
            </button>
          }
        />
      ) : (
        <div className="space-y-6">
          {grouped.map(([category, entries]) => (
            <section key={category} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-title-3 font-semibold text-mist">{category}</h2>
                <span className="text-[11px] text-mist-faint">
                  {entries.length} module{entries.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {entries.map((entry) => (
                  <ModuleCard key={entry.id} guildId={guildId} entry={entry} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
