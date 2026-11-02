'use client';

import * as React from 'react';
import { AlertCircle, Image as ImageIcon, Loader2, RotateCw, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Notice, SectionCard, SettingRow } from '@/components/dashboard/kit';
import { CARD_TEMPLATES, CARD_TYPES } from '@/lib/modules/catalog';
import { cn } from '@/lib/utils';

interface CardSampleState {
  username: string;
  displayName: string;
  serverName: string;
  memberCount: number;
  level: number;
  rank: number;
  xp: number;
  message: string;
}

function useCardPreview({
  guildId,
  type,
  template,
  sample,
}: {
  guildId: string;
  type: string;
  template: string;
  sample: CardSampleState;
}) {
  const [url, setUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [nonce, setNonce] = React.useState(0);
  const currentUrl = React.useRef<string | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ template: template || 'aurora' });
      for (const [key, value] of Object.entries(sample)) {
        if (value === null || value === undefined || value === '') continue;
        params.set(key, String(value));
      }

      try {
        const response = await fetch(
          `/api/guilds/${guildId}/render/${encodeURIComponent(type)}?${params.toString()}`,
          { credentials: 'same-origin', signal: controller.signal, cache: 'no-store' },
        );

        if (!response.ok) {
          const contentType = response.headers.get('content-type') ?? '';
          if (contentType.includes('application/json')) {
            const body = (await response.json()) as { error?: { message?: string } };
            throw new Error(body.error?.message ?? 'The card renderer rejected that preview.');
          }
          throw new Error(`The card renderer returned ${response.status}.`);
        }

        const blob = await response.blob();
        const nextUrl = URL.createObjectURL(blob);
        if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
        currentUrl.current = nextUrl;
        setUrl(nextUrl);
      } catch (renderError) {
        if (controller.signal.aborted) return;
        setError(
          renderError instanceof Error
            ? renderError.message
            : 'The card preview could not be rendered.',
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 320);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [guildId, type, template, sample, nonce]);

  React.useEffect(
    () => () => {
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
    },
    [],
  );

  return { url, loading, error, refresh: () => setNonce((value) => value + 1) };
}

function SampleInput({
  label,
  value,
  onChange,
  type = 'text',
  min,
  max,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'number';
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-mist-dim">{label}</label>
      <Input
        type={type}
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 text-xs"
      />
    </div>
  );
}

export function CardDesigner({
  guildId,
  guildName,
  moduleId,
  template,
  onTemplateChange,
  cardEnabled,
  onCardEnabledChange,
  cardEnabledLabel,
  sampleMessage,
}: {
  guildId: string;
  guildName: string;
  moduleId: 'welcome' | 'leveling';
  template: string;
  onTemplateChange: (value: string) => void;
  cardEnabled: boolean;
  onCardEnabledChange?: (value: boolean) => void;
  cardEnabledLabel?: string;
  sampleMessage?: string;
}) {
  const templates = CARD_TEMPLATES[moduleId === 'welcome' ? 'welcome' : 'rank'];
  const types = CARD_TYPES[moduleId];
  const [type, setType] = React.useState(types[0]?.value ?? 'welcome');
  const [sample, setSample] = React.useState<CardSampleState>({
    username: 'nova',
    displayName: 'Nova',
    serverName: guildName,
    memberCount: 128,
    level: 24,
    rank: 7,
    xp: 18_420,
    message: sampleMessage ?? 'Welcome to the server!',
  });

  React.useEffect(() => {
    setType(types[0]?.value ?? 'welcome');
  }, [moduleId, types]);

  React.useEffect(() => {
    setSample((current) => ({ ...current, serverName: guildName }));
  }, [guildName]);

  React.useEffect(() => {
    if (sampleMessage === undefined) return;
    setSample((current) => ({ ...current, message: sampleMessage }));
  }, [sampleMessage]);

  const preview = useCardPreview({ guildId, type, template, sample });
  const selected = templates.find((entry) => entry.id === template) ?? templates[0];
  const setSampleValue = <K extends keyof CardSampleState>(key: K, value: CardSampleState[K]) =>
    setSample((current) => ({ ...current, [key]: value }));

  return (
    <SectionCard
      title="Live card designer"
      description="Rendered by the bot's real canvas engine. Pick a template, switch the card type and tune the sample values before saving."
      icon={<ImageIcon />}
      action={
        <Badge tone="emerald">
          <Sparkles className="size-3" />
          Live preview
        </Badge>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[1fr_1.15fr]">
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-mist-faint">
              Card type
            </p>
            <Tabs value={type} onValueChange={setType}>
              <TabsList>
                {types.map((entry) => (
                  <TabsTrigger key={entry.value} value={entry.value}>
                    {entry.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-mist-faint">
                Template
              </p>
              <span className="text-[11px] text-mist-faint">{selected?.name ?? 'Aurora'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
              {templates.map((entry) => {
                const active = entry.id === template;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => onTemplateChange(entry.id)}
                    aria-pressed={active}
                    className={cn(
                      'cursor-pointer overflow-hidden rounded-md border text-left transition-colors',
                      active
                        ? 'border-emerald/50 bg-emerald/[0.06]'
                        : 'border-hairline bg-void/40 hover:border-white/15',
                    )}
                  >
                    <span
                      className="block h-9 w-full"
                      style={{
                        background: `linear-gradient(120deg, ${entry.from}, ${entry.to})`,
                      }}
                    />
                    <span className="flex items-center justify-between gap-2 px-2 py-1.5">
                      <span
                        className={cn(
                          'text-[11px] font-medium',
                          active ? 'text-emerald' : 'text-mist-dim',
                        )}
                      >
                        {entry.name}
                      </span>
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: entry.accent }}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {onCardEnabledChange && (
            <div className="rounded-md border border-hairline bg-white/[0.02] px-3">
              <SettingRow
                label={cardEnabledLabel ?? 'Generate cards'}
                description="When this is off, the bot sends the text message without an image."
                className="py-2.5"
              >
                <Switch
                  checked={cardEnabled}
                  onCheckedChange={onCardEnabledChange}
                  aria-label={cardEnabledLabel ?? 'Generate cards'}
                />
              </SettingRow>
            </div>
          )}

          <details className="group rounded-md border border-hairline bg-void/30 px-3 py-2">
            <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.08em] text-mist-faint transition-colors hover:text-mist">
              Sample data
            </summary>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              <SampleInput
                label="Username"
                value={sample.username}
                onChange={(value) => setSampleValue('username', value)}
              />
              <SampleInput
                label="Display name"
                value={sample.displayName}
                onChange={(value) => setSampleValue('displayName', value)}
              />
              <SampleInput
                label="Server name"
                value={sample.serverName}
                onChange={(value) => setSampleValue('serverName', value)}
              />
              <SampleInput
                label="Member count"
                type="number"
                min={1}
                value={sample.memberCount}
                onChange={(value) => setSampleValue('memberCount', Number(value) || 1)}
              />
              {moduleId === 'leveling' ? (
                <>
                  <SampleInput
                    label="Level"
                    type="number"
                    min={1}
                    value={sample.level}
                    onChange={(value) => setSampleValue('level', Number(value) || 1)}
                  />
                  <SampleInput
                    label="Rank"
                    type="number"
                    min={1}
                    value={sample.rank}
                    onChange={(value) => setSampleValue('rank', Number(value) || 1)}
                  />
                  <SampleInput
                    label="XP"
                    type="number"
                    min={0}
                    value={sample.xp}
                    onChange={(value) => setSampleValue('xp', Number(value) || 0)}
                  />
                </>
              ) : (
                <div className="sm:col-span-2">
                  <SampleInput
                    label="Message"
                    value={sample.message}
                    onChange={(value) => setSampleValue('message', value)}
                  />
                </div>
              )}
            </div>
          </details>
        </div>

        <div className="space-y-2">
          <div className="relative aspect-[3/1] overflow-hidden rounded-md border border-hairline bg-obsidian-raised">
            {preview.url ? (
              // The source is a same-origin blob URL produced by the signed
              // render route; next/image would add no value here.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.url}
                alt={`${selected?.name ?? 'Card'} preview`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                {preview.error ? (
                  <AlertCircle className="size-5 text-danger" />
                ) : (
                  <Loader2 className="size-5 animate-spin text-mist-faint" />
                )}
              </div>
            )}
            {preview.loading && preview.url && (
              <span className="absolute inset-0 grid place-items-center bg-void/45 backdrop-blur-[1px]">
                <Loader2 className="size-5 animate-spin text-emerald" />
              </span>
            )}
          </div>

          {preview.error && (
            <div className="rounded-md border border-danger/25 bg-danger/[0.06] px-3 py-2">
              <p className="text-xs font-semibold text-mist">Preview unavailable</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-mist-dim">{preview.error}</p>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-mist-faint">
              Rendered at 900 × 300 by the bot. Saving applies the template to this server.
            </p>
            <Button variant="ghost" size="sm" onClick={preview.refresh} className="shrink-0">
              <RotateCw className="size-3.5" />
              Refresh
            </Button>
          </div>

          {!cardEnabled && (
            <Notice tone="warning" title="Card generation is off">
              The preview is live, but the bot will keep sending the text message without an image
              until you enable cards above.
            </Notice>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
