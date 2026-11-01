'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Command, Search, Shield, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/ui/copy-button';
import { EmptyState } from '@/components/ui/empty-state';
import { commands, commandCategories, type CommandCategory } from '@/config/commands';
import { cn } from '@/lib/utils';

const FILTERS: (CommandCategory | 'All')[] = ['All', ...commandCategories];

export function CommandsExplorer() {
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState<CommandCategory | 'All'>('All');

  const filtered = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    return commands.filter((command) => {
      const matchesCategory = category === 'All' || command.category === category;
      const matchesTerm =
        !term ||
        command.name.toLowerCase().includes(term) ||
        command.description.toLowerCase().includes(term) ||
        command.usage.toLowerCase().includes(term);
      return matchesCategory && matchesTerm;
    });
  }, [query, category]);

  const grouped = React.useMemo(() => {
    const map = new Map<CommandCategory, typeof commands>();
    for (const command of filtered) {
      const list = map.get(command.category) ?? [];
      list.push(command);
      map.set(command.category, list);
    }
    return map;
  }, [filtered]);

  return (
    <div>
      <div className="flex flex-col gap-4">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-mist-faint" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search commands"
            aria-label="Search commands"
            className="h-11 pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((item) => {
            const active = category === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={cn(
                  'cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  active
                    ? 'border-emerald/40 bg-emerald/10 text-emerald'
                    : 'border-hairline bg-white/[0.02] text-mist-dim hover:border-white/15 hover:text-mist',
                )}
              >
                {item}
                <span className="ml-1.5 text-[10px] text-mist-faint">
                  {item === 'All'
                    ? commands.length
                    : commands.filter((command) => command.category === item).length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-5 text-xs text-mist-faint">
        {filtered.length} {filtered.length === 1 ? 'command' : 'commands'}
        {query ? ` matching “${query.trim()}”` : ''}
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={<Command />}
          title="No command matches that"
          description="Try a shorter search, or pick a different category."
          action={
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setCategory('All');
              }}
              className="cursor-pointer text-xs font-semibold text-emerald underline-offset-4 hover:underline"
            >
              Clear the filter
            </button>
          }
        />
      ) : (
        <div className="mt-3 space-y-10">
          {commandCategories
            .filter((item) => grouped.has(item))
            .map((item) => (
              <section key={item} aria-labelledby={`commands-${item}`}>
                <div className="mb-3 flex items-baseline gap-2">
                  <h2 id={`commands-${item}`} className="font-display text-xl font-semibold text-mist">
                    {item}
                  </h2>
                  <span className="text-xs text-mist-faint">
                    {grouped.get(item)?.length} {grouped.get(item)?.length === 1 ? 'command' : 'commands'}
                  </span>
                </div>

                <ul className="divide-y divide-white/[0.05] overflow-hidden rounded-lg border border-hairline bg-obsidian/40">
                  <AnimatePresence initial={false}>
                    {grouped.get(item)?.map((command) => (
                      <motion.li
                        key={`${command.category}-${command.name}`}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="group flex flex-col gap-2 px-4 py-3.5 transition-colors hover:bg-white/[0.02] sm:flex-row sm:items-center sm:gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <code className="font-mono text-sm font-semibold text-emerald">
                              /{command.name}
                            </code>
                            {command.premium && (
                              <Badge tone="champagne">
                                <Sparkles className="size-3" />
                                Premium
                              </Badge>
                            )}
                            {command.permissions && (
                              <Badge tone="neutral">
                                <Shield className="size-3" />
                                {command.permissions}
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 text-sm leading-relaxed text-mist-dim">
                            {command.description}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5 rounded-sm border border-hairline bg-void/50 py-1 pl-2.5 pr-1">
                          <code className="font-mono text-[11px] text-mist-faint">{command.usage}</code>
                          <CopyButton value={command.usage} label={`Copy ${command.name} usage`} size="icon-sm" />
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}
