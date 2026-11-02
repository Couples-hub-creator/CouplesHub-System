'use client';

import * as React from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Layers, Lock, RotateCcw, Save, Search, Sparkles } from 'lucide-react';
import { api, ApiClientError } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { PageHeader } from '@/components/ui/page-header';
import { SaveBar } from '@/components/ui/save-bar';
import { FormSkeleton, Notice, Picker, SectionCard, SettingRow } from '@/components/dashboard/kit';
import { useDiscordMeta } from '@/lib/hooks/use-settings';
import { cn } from '@/lib/utils';

type FieldType =
  | 'toggle'
  | 'number'
  | 'slider'
  | 'text'
  | 'textarea'
  | 'select'
  | 'channel'
  | 'role'
  | 'user'
  | 'color'
  | 'image'
  | 'embed'
  | 'card'
  | 'rule'
  | 'schedule'
  | 'table';

interface ModuleField {
  key: string;
  type: FieldType;
  label: string;
  help?: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  options?: { label: string; value: string }[];
}

interface ModuleSection {
  id: string;
  title: string;
  description?: string;
  fields: ModuleField[];
}

interface CatalogModule {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  premium: boolean;
  supportsConfig: boolean;
  configured: boolean;
  config: Record<string, unknown> | null;
  defaults: Record<string, unknown> | null;
  ui: { sections: ModuleSection[] };
}

interface CatalogResponse {
  modules: CatalogModule[];
}

type Config = Record<string, unknown>;

const DEDICATED: Record<string, { href: string; label: string }> = {
  music: { href: 'music', label: 'Open the player and radio settings' },
  moderation: { href: 'moderation', label: 'Open moderation settings' },
  leveling: { href: 'leveling', label: 'Open leveling settings' },
  welcome: { href: 'welcome', label: 'Open welcome settings' },
  logging: { href: 'logs', label: 'Open logging settings' },
  ai: { href: 'ai-chat', label: 'Open AI chat settings' },
  automod: { href: 'automod', label: 'Open AutoMod rules' },
  roles: { href: 'roles', label: 'Open role menus' },
  schedule: { href: 'schedule', label: 'Open scheduled tasks' },
};

const JSON_TYPES: FieldType[] = ['table', 'rule', 'schedule', 'embed', 'card'];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function CatalogIcon({ name }: { name: string }) {
  return (
    <span className="gem grid size-8 shrink-0 place-items-center text-[11px] font-semibold uppercase text-emerald">
      {name.slice(0, 2)}
    </span>
  );
}

function JsonField({
  field,
  value,
  onChange,
}: {
  field: ModuleField;
  value: unknown;
  onChange: (next: unknown) => void;
}) {
  const [text, setText] = React.useState(() => JSON.stringify(value ?? null, null, 2));
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setText(JSON.stringify(value ?? null, null, 2));
    setError(null);
  }, [value]);

  return (
    <div className="w-full">
      <Textarea
        value={text}
        spellCheck={false}
        className="min-h-[140px] font-mono text-xs"
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          try {
            onChange(JSON.parse(next));
            setError(null);
          } catch {
            setError('This value must be valid JSON.');
          }
        }}
      />
      {error ? (
        <p className="mt-1.5 text-xs text-danger">{error}</p>
      ) : (
        <p className="mt-1.5 text-[11px] leading-relaxed text-mist-faint">
          {field.help ?? 'JSON is validated on save by the bot.'}
        </p>
      )}
    </div>
  );
}

function FieldControl({
  field,
  value,
  config,
  onChange,
  channels,
  roles,
}: {
  field: ModuleField;
  value: unknown;
  config: Config;
  onChange: (next: unknown) => void;
  channels: { id: string; name: string }[];
  roles: { id: string; name: string }[];
}) {
  if (field.type === 'toggle') {
    return <Switch checked={Boolean(value)} onCheckedChange={onChange} aria-label={field.label} />;
  }

  if (field.type === 'slider') {
    const step = field.step ?? 1;
    const numeric = typeof value === 'number' ? value : field.min ?? 0;
    return (
      <div className="flex w-full items-center gap-3">
        <Slider
          value={[numeric]}
          min={field.min ?? 0}
          max={field.max ?? 100}
          step={step}
          onValueChange={([next]) => onChange(next)}
          aria-label={field.label}
        />
        <span className="w-14 shrink-0 text-right font-mono text-xs tabular text-mist-dim">
          {numeric}
        </span>
      </div>
    );
  }

  if (field.type === 'number') {
    return (
      <Input
        type="number"
        value={typeof value === 'number' ? value : ''}
        min={field.min}
        max={field.max}
        step={field.step ?? 1}
        onChange={(event) => {
          const next = event.target.value;
          onChange(next === '' ? 0 : Number(next));
        }}
        aria-label={field.label}
        className="font-mono text-sm"
      />
    );
  }

  if (field.type === 'select') {
    return (
      <Picker
        value={typeof value === 'string' ? value : null}
        onChange={(next) => onChange(next ?? field.options?.[0]?.value ?? '')}
        options={field.options ?? []}
        placeholder={field.placeholder ?? 'Select an option'}
        id={`module-${field.key}`}
      />
    );
  }

  if (field.type === 'channel') {
    return (
      <Picker
        value={typeof value === 'string' ? value : null}
        onChange={(next) => onChange(next)}
        options={channels.map((channel) => ({ value: channel.id, label: `# ${channel.name}` }))}
        placeholder="Select a channel"
        allowNone
        noneLabel="Not set"
        id={`module-${field.key}`}
      />
    );
  }

  if (field.type === 'role') {
    return (
      <Picker
        value={typeof value === 'string' ? value : null}
        onChange={(next) => onChange(next)}
        options={roles.map((role) => ({ value: role.id, label: role.name }))}
        placeholder="Select a role"
        allowNone
        noneLabel="Not set"
        id={`module-${field.key}`}
      />
    );
  }

  if (field.type === 'color') {
    const color = typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : '#19D68F';
    return (
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={color}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          aria-label={field.label}
          className="h-9 w-14 cursor-pointer rounded-sm border border-hairline bg-obsidian/60 p-1"
        />
        <Input
          value={color}
          onChange={(event) => {
            const next = event.target.value;
            if (/^#[0-9a-f]{0,6}$/i.test(next)) onChange(next);
          }}
          maxLength={7}
          className="h-9 w-28 font-mono text-xs uppercase"
          aria-label={`${field.label} hex value`}
        />
      </div>
    );
  }

  if (JSON_TYPES.includes(field.type)) {
    return <JsonField field={field} value={value} onChange={onChange} />;
  }

  if (field.type === 'textarea') {
    return (
      <Textarea
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
        aria-label={field.label}
      />
    );
  }

  if (field.type === 'text' && Array.isArray(value)) {
    return (
      <Input
        value={value.join(', ')}
        onChange={(event) =>
          onChange(
            event.target.value
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean),
          )
        }
        placeholder={field.placeholder ?? 'Comma-separated values'}
        aria-label={field.label}
      />
    );
  }

  if (field.type === 'user' || field.type === 'image' || field.type === 'text') {
    return (
      <Input
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
        aria-label={field.label}
      />
    );
  }

  return (
    <JsonField
      field={field}
      value={config[field.key]}
      onChange={(next) => onChange(next)}
    />
  );
}

export function ModulesView({ guildId }: { guildId: string }) {
  const queryClient = useQueryClient();
  const catalog = useQuery({
    queryKey: ['modules', guildId],
    queryFn: () => api.get<CatalogResponse>(`/api/guilds/${guildId}/modules`),
    staleTime: 30_000,
    retry: false,
  });
  const meta = useDiscordMeta(guildId);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [draft, setDraft] = React.useState<Config | null>(null);

  const modules = React.useMemo(() => catalog.data?.modules ?? [], [catalog.data]);
  const selected = modules.find((entry) => entry.id === selectedId) ?? null;

  React.useEffect(() => {
    if (selectedId && modules.some((entry) => entry.id === selectedId)) return;
    const first = modules.find((entry) => entry.supportsConfig && !DEDICATED[entry.id]) ?? modules[0];
    if (first) setSelectedId(first.id);
  }, [modules, selectedId]);

  React.useEffect(() => {
    if (!selected) {
      setDraft(null);
      return;
    }
    setDraft(selected.config ? clone(selected.config) : null);
  }, [selected]);

  const channelOptions = React.useMemo(() => {
    const data = meta.channels.data;
    return [
      ...(data?.text ?? []),
      ...(data?.voice ?? []),
      ...(data?.categories ?? []),
    ];
  }, [meta.channels.data]);

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return modules;
    return modules.filter(
      (entry) =>
        entry.name.toLowerCase().includes(term) ||
        entry.description.toLowerCase().includes(term) ||
        entry.category.toLowerCase().includes(term),
    );
  }, [modules, search]);

  const groups = React.useMemo(() => {
    const map = new Map<string, CatalogModule[]>();
    for (const entry of filtered) {
      const list = map.get(entry.category) ?? [];
      list.push(entry);
      map.set(entry.category, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const dirty = Boolean(
    selected && draft && selected.config && JSON.stringify(draft) !== JSON.stringify(selected.config),
  );

  const save = useMutation({
    mutationFn: (config: Config) =>
      api.patch<{ moduleId: string; version: number; config: Config }>(
        `/api/guilds/${guildId}/modules/${selectedId}`,
        { config },
      ),
    onSuccess: (saved) => {
      queryClient.setQueryData<CatalogResponse>(['modules', guildId], (current) =>
        current
          ? {
              modules: current.modules.map((entry) =>
                entry.id === saved.moduleId
                  ? { ...entry, config: saved.config, configured: true }
                  : entry,
              ),
            }
          : current,
      );
      setDraft(clone(saved.config));
      toast.success('Module settings saved');
    },
    onError: (error) => {
      toast.error(error instanceof ApiClientError ? error.message : 'That change did not save.');
    },
  });

  const update = (key: string, next: unknown) => {
    setDraft((current) => (current ? { ...current, [key]: next } : current));
  };

  const dedicated = selected ? DEDICATED[selected.id] : null;
  const canEdit = Boolean(selected?.supportsConfig && !dedicated);

  return (
    <div className="mx-auto w-full max-w-shell space-y-5 pb-16">
      <PageHeader
        title="Modules"
        description="Every module&apos;s behavior in one place. Dedicated pages stay linked where they exist."
        icon={<Layers />}
        action={
          catalog.data ? (
            <Badge tone="neutral">{modules.length} modules</Badge>
          ) : null
        }
      />

      {catalog.isLoading ? (
        <SectionCard title="module catalog" description="Loading the bot manifest" icon={<Layers />}>
          <FormSkeleton rows={6} />
        </SectionCard>
      ) : catalog.error ? (
        <Notice tone="danger" title="Could not load the module catalog">
          {catalog.error instanceof Error
            ? catalog.error.message
            : 'The bot control API is not reachable from this deployment.'}
        </Notice>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-mist-faint" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Filter modules"
                className="pl-8"
                aria-label="Filter modules"
              />
            </div>
            <div className="max-h-[calc(100dvh-15rem)] overflow-y-auto rounded-lg border border-hairline bg-obsidian/40 p-2">
              {groups.map(([category, list]) => (
                <div key={category} className="mb-2 last:mb-0">
                  <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-mist-faint">
                    {category}
                  </p>
                  <div className="space-y-0.5">
                    {list.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => setSelectedId(entry.id)}
                        className={cn(
                          'flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-left text-sm transition-colors',
                          entry.id === selectedId
                            ? 'bg-emerald/[0.08] text-mist'
                            : 'text-mist-dim hover:bg-white/[0.04] hover:text-mist',
                        )}
                      >
                        <CatalogIcon name={entry.name} />
                        <span className="min-w-0 flex-1 truncate">{entry.name}</span>
                        {entry.premium && <Sparkles className="size-3 text-champagne" />}
                        {DEDICATED[entry.id] && <Lock className="size-3 text-mist-faint" />}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {!groups.length && (
                <p className="px-2 py-6 text-center text-xs text-mist-faint">No modules match that filter.</p>
              )}
            </div>
          </div>

          <div className="min-w-0 space-y-4">
            {!selected ? (
              <SectionCard title="Choose a module" description="Pick a module from the list." icon={<Layers />}>
                <p className="text-sm text-mist-dim">Nothing selected.</p>
              </SectionCard>
            ) : (
              <>
                <SectionCard
                  title={selected.name}
                  description={selected.description}
                  icon={<CatalogIcon name={selected.name} />}
                  action={
                    <div className="flex items-center gap-2">
                      {selected.premium && <Badge tone="champagne">Premium</Badge>}
                      <Badge tone={selected.config?.enabled === false ? 'neutral' : 'emerald'}>
                        {selected.config?.enabled === false ? 'Off' : 'On'}
                      </Badge>
                    </div>
                  }
                >
                  {dedicated ? (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="max-w-prose text-sm leading-relaxed text-mist-dim">
                        {selected.name} has its own page with live state, history or structured editors.
                        Use it so nothing is flattened into a generic form.
                      </p>
                      <Button asChild variant="outline">
                        <Link href={`/dashboard/${guildId}/${dedicated.href}`}>{dedicated.label}</Link>
                      </Button>
                    </div>
                  ) : !selected.supportsConfig || !draft ? (
                    <Notice tone="warning" title="No editable configuration">
                      This module does not expose a configuration schema. Its commands still respect the
                      server&apos;s module settings.
                    </Notice>
                  ) : (
                    <div className="space-y-1">
                      {selected.ui.sections.map((section) => (
                        <div key={section.id} className="border-b border-hairline pb-4 pt-2 last:border-0 last:pb-0">
                          <h3 className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-mist-faint">
                            {section.title}
                          </h3>
                          {section.description && (
                            <p className="mb-2 text-xs leading-relaxed text-mist-dim">{section.description}</p>
                          )}
                          {section.fields.map((field) => (
                            <SettingRow
                              key={field.key}
                              label={field.label}
                              description={field.help}
                              htmlFor={`module-${field.key}`}
                            >
                              <FieldControl
                                field={field}
                                value={draft[field.key]}
                                config={draft}
                                onChange={(next) => update(field.key, next)}
                                channels={channelOptions}
                                roles={meta.roles.data ?? []}
                              />
                            </SettingRow>
                          ))}
                        </div>
                      ))}
                      {selected.ui.sections.length === 0 && (
                        <p className="text-sm text-mist-dim">No fields are defined for this module.</p>
                      )}
                    </div>
                  )}
                </SectionCard>

                {!dedicated && selected.supportsConfig && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selected.config && setDraft(clone(selected.config))}
                      disabled={!dirty || save.isPending}
                    >
                      <RotateCcw className="size-3.5" />
                      Discard changes
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => draft && save.mutate(draft)}
                      loading={save.isPending}
                      disabled={!dirty || !draft}
                    >
                      {!save.isPending && <Save className="size-3.5" />}
                      Save module
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <SaveBar
        visible={dirty && canEdit}
        saving={save.isPending}
        onSave={() => draft && save.mutate(draft)}
        onReset={() => selected?.config && setDraft(clone(selected.config))}
        label="Save module"
      />
    </div>
  );
}
