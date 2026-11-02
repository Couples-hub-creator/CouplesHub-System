'use client';

import * as React from 'react';
import { Plus, X } from 'lucide-react';
import type { ModuleField, ModuleSection } from '@/lib/modules/catalog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { MultiPicker, Picker, SectionCard, SettingRow } from '@/components/dashboard/kit';
import { cn } from '@/lib/utils';

type Config = Record<string, unknown>;
type ChannelMeta = {
  text: { id: string; name: string }[];
  voice: { id: string; name: string }[];
  categories: { id: string; name: string }[];
};
type RoleMeta = { id: string; name: string; color: string | null }[];

const FULL_WIDTH_TYPES = new Set<ModuleField['type']>([
  'textarea',
  'table',
  'rule',
  'embed',
  'card',
  'schedule',
  'string-list',
]);

function humanDuration(ms: number): string | null {
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const units: Array<[number, string]> = [
    [86_400_000, 'day'],
    [3_600_000, 'hour'],
    [60_000, 'minute'],
    [1_000, 'second'],
  ];
  for (const [size, label] of units) {
    if (ms >= size) {
      const value = ms / size;
      const rounded = Number.isInteger(value) ? value : Math.round(value * 10) / 10;
      return `${rounded} ${label}${rounded === 1 ? '' : 's'}`;
    }
  }
  return `${ms} ms`;
}

function durationHint(field: ModuleField, value: unknown): string | null {
  if (typeof value !== 'number') return null;
  if (field.key.endsWith('Ms')) return humanDuration(value);
  if (field.key.endsWith('Seconds')) return humanDuration(value * 1_000);
  if (field.key.endsWith('Days')) return `${value} day${value === 1 ? '' : 's'}`;
  if (field.key === 'deleteAfter') return humanDuration(value * 1_000);
  return null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function StringListInput({
  value,
  onChange,
  placeholder,
  max,
  id,
}: {
  value: unknown;
  onChange: (next: string[]) => void;
  placeholder?: string;
  max?: number;
  id?: string;
}) {
  const items = isStringArray(value) ? value : [];
  const [term, setTerm] = React.useState('');

  const add = () => {
    const next = term.trim();
    if (!next) return;
    if (items.includes(next)) {
      setTerm('');
      return;
    }
    if (max && items.length >= max) return;
    onChange([...items, next]);
    setTerm('');
  };

  return (
    <div>
      <div className="flex gap-2">
        <Input
          id={id}
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add();
            }
          }}
          placeholder={placeholder ?? 'Type a value and press Enter'}
          className="h-9 text-sm"
        />
        <Button type="button" variant="outline" size="sm" onClick={add} className="h-9 shrink-0">
          <Plus className="size-3.5" />
          Add
        </Button>
      </div>
      {items.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 rounded-full border border-hairline bg-white/[0.04] py-0.5 pl-2 pr-1 text-[11px] text-mist-dim"
            >
              <span className="max-w-56 truncate">{item}</span>
              <button
                type="button"
                onClick={() => onChange(items.filter((valueItem) => valueItem !== item))}
                aria-label={`Remove ${item}`}
                className="cursor-pointer rounded-full p-0.5 text-mist-faint hover:text-danger"
              >
                <X className="size-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <p className="mt-1.5 text-[11px] text-mist-faint">
        {items.length}
        {max ? ` / ${max}` : ''} values
      </p>
    </div>
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
          {field.help ?? 'JSON is validated by the bot when you save.'}
        </p>
      )}
    </div>
  );
}

function RoleRewardsEditor({
  value,
  onChange,
  roles,
}: {
  value: unknown;
  onChange: (next: Array<{ level: number; roleId: string }>) => void;
  roles: RoleMeta;
}) {
  const rows = Array.isArray(value)
    ? value.filter(
        (row): row is { level: number; roleId: string } =>
          Boolean(row) &&
          typeof row === 'object' &&
          typeof (row as { level?: unknown }).level === 'number' &&
          typeof (row as { roleId?: unknown }).roleId === 'string',
      )
    : [];

  const update = (index: number, patch: Partial<{ level: number; roleId: string }>) => {
    onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  };

  return (
    <div className="space-y-2">
      {rows.length === 0 && (
        <p className="rounded-sm border border-dashed border-white/10 bg-white/[0.015] px-3 py-3 text-xs text-mist-faint">
          No level rewards yet. Add the first one below.
        </p>
      )}
      {rows.map((row, index) => (
        <div key={`${row.roleId}-${index}`} className="grid gap-2 sm:grid-cols-[6rem_1fr_auto]">
          <Input
            type="number"
            min={1}
            max={1000}
            value={row.level}
            onChange={(event) => update(index, { level: Number(event.target.value) || 1 })}
            aria-label={`Reward level ${index + 1}`}
            className="h-9 text-sm"
          />
          <Picker
            value={row.roleId || null}
            onChange={(next) => update(index, { roleId: next ?? '' })}
            options={roles.map((role) => ({ value: role.id, label: role.name }))}
            placeholder="Pick a role"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove reward ${index + 1}`}
            onClick={() => onChange(rows.filter((_item, rowIndex) => rowIndex !== index))}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange([
            ...rows,
            { level: Math.max(1, (rows[rows.length - 1]?.level ?? 0) + 5), roleId: '' },
          ])
        }
      >
        <Plus className="size-3.5" />
        Add reward
      </Button>
    </div>
  );
}

function channelOptions(field: ModuleField, channels: ChannelMeta) {
  const key = field.key.toLowerCase();
  if (key.includes('category')) {
    return channels.categories.map((channel) => ({ value: channel.id, label: channel.name }));
  }
  const textKeys = [
    'log',
    'welcome',
    'leave',
    'boost',
    'levelup',
    'panel',
    'transcript',
    'suggestion',
    'starboard',
    'poll',
    'birthday',
    'ticket',
    'giveaway',
    'reminder',
    'afk',
    'verify',
    'rules',
    'announcement',
    'general',
    'chat',
    'command',
    'schedule',
    'message',
  ];
  if (textKeys.some((part) => key.includes(part))) {
    return channels.text.map((channel) => ({ value: channel.id, label: `# ${channel.name}` }));
  }
  return [
    ...channels.text.map((channel) => ({ value: channel.id, label: `# ${channel.name}` })),
    ...channels.voice.map((channel) => ({ value: channel.id, label: `Voice: ${channel.name}` })),
  ];
}

function TableField({
  field,
  value,
  onChange,
  channels,
  roles,
}: {
  field: ModuleField;
  value: unknown;
  onChange: (next: unknown) => void;
  channels: ChannelMeta;
  roles: RoleMeta;
}) {
  if (field.key === 'roleRewards') {
    return <RoleRewardsEditor value={value} onChange={onChange} roles={roles} />;
  }

  if (['autoRoles', 'staffRoles', 'whitelistRoles', 'ignoredRoles'].includes(field.key)) {
    return (
      <MultiPicker
        values={isStringArray(value) ? value : []}
        onChange={onChange}
        options={roles
          .filter((role) => role.name !== '@everyone')
          .map((role) => ({ value: role.id, label: role.name }))}
        placeholder="Nothing selected"
        max={100}
      />
    );
  }

  if (['whitelistChannels', 'ignoredChannels'].includes(field.key)) {
    return (
      <MultiPicker
        values={isStringArray(value) ? value : []}
        onChange={onChange}
        options={channels.text.map((channel) => ({ value: channel.id, label: `# ${channel.name}` }))}
        placeholder="Nothing selected"
        max={100}
      />
    );
  }

  if (
    ['allowedDomains', 'whitelistUsers', 'badWords', 'blockedWords', 'keywords'].includes(field.key)
  ) {
    return (
      <StringListInput
        value={value}
        onChange={onChange}
        placeholder={
          field.key === 'allowedDomains' ? 'example.com' : 'Type a value and press Enter'
        }
      />
    );
  }

  return <JsonField field={field} value={value} onChange={onChange} />;
}

function FieldControl({
  field,
  value,
  onChange,
  channels,
  roles,
}: {
  field: ModuleField;
  value: unknown;
  onChange: (next: unknown) => void;
  channels: ChannelMeta;
  roles: RoleMeta;
}) {
  if (field.type === 'toggle' || field.type === 'boolean') {
    return (
      <Switch
        checked={Boolean(value)}
        onCheckedChange={onChange}
        aria-label={field.label}
      />
    );
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

  if (field.type === 'number' || field.type === 'duration') {
    const hint = durationHint(field, value);
    return (
      <div>
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
        {hint && <p className="mt-1 text-[11px] text-mist-faint">{hint}</p>}
      </div>
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
        options={channelOptions(field, channels)}
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

  if (field.type === 'table') {
    return (
      <TableField
        field={field}
        value={value}
        onChange={onChange}
        channels={channels}
        roles={roles}
      />
    );
  }

  if (field.type === 'rule' || field.type === 'embed' || field.type === 'card' || field.type === 'schedule') {
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

  if (field.type === 'string-list' || (field.type === 'text' && Array.isArray(value))) {
    return (
      <StringListInput
        value={value}
        onChange={onChange}
        placeholder={field.placeholder ?? 'Type a value and press Enter'}
        max={50}
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

  return <JsonField field={field} value={value} onChange={onChange} />;
}

export function SchemaField({
  field,
  value,
  onChange,
  channels,
  roles,
  idPrefix = 'module',
}: {
  field: ModuleField;
  value: unknown;
  onChange: (next: unknown) => void;
  channels: ChannelMeta;
  roles: RoleMeta;
  idPrefix?: string;
}) {
  const id = `${idPrefix}-${field.key}`;
  const fullWidth =
    FULL_WIDTH_TYPES.has(field.type) || (field.type === 'text' && Array.isArray(value));

  const control = (
    <FieldControl
      field={field}
      value={value}
      onChange={onChange}
      channels={channels}
      roles={roles}
    />
  );

  if (fullWidth) {
    return (
      <div className="py-3.5">
        <label htmlFor={id} className="text-sm font-medium text-mist">
          {field.label}
        </label>
        {field.help && (
          <p className="mt-0.5 max-w-prose text-xs leading-relaxed text-mist-dim">{field.help}</p>
        )}
        <div className="mt-2">{control}</div>
      </div>
    );
  }

  return (
    <SettingRow label={field.label} description={field.help} htmlFor={id}>
      {control}
    </SettingRow>
  );
}

export function ModuleSchemaForm({
  sections,
  config,
  onChange,
  channels,
  roles,
  excludeKeys = [],
  idPrefix = 'module',
}: {
  sections: ModuleSection[];
  config: Config;
  onChange: (key: string, value: unknown) => void;
  channels: ChannelMeta;
  roles: RoleMeta;
  excludeKeys?: string[];
  idPrefix?: string;
}) {
  const excluded = new Set(excludeKeys);
  const visibleSections = sections
    .map((section) => ({
      ...section,
      fields: section.fields.filter((field) => !excluded.has(field.key)),
    }))
    .filter((section) => section.fields.length > 0);

  if (visibleSections.length === 0) return null;

  return (
    <div className={cn('space-y-4')}>
      {visibleSections.map((section) => (
        <SectionCard
          key={section.id}
          title={section.title}
          description={section.description}
        >
          {section.fields.map((field) => (
            <SchemaField
              key={field.key}
              field={field}
              value={config[field.key]}
              onChange={(next) => onChange(field.key, next)}
              channels={channels}
              roles={roles}
              idPrefix={idPrefix}
            />
          ))}
        </SectionCard>
      ))}
    </div>
  );
}
