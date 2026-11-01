'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Bot,
  Brain,
  Gauge,
  MessageSquareText,
  Plus,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import { api, type PremiumResponse } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { SaveBar } from '@/components/ui/save-bar';
import { FormSkeleton, MultiPicker, Notice, SectionCard, SettingRow } from '@/components/dashboard/kit';
import { useDiscordMeta, useGuildSettings } from '@/lib/hooks/use-settings';
import { cn } from '@/lib/utils';

type AiSettings = {
  enabled: boolean;
  channels: string[];
  triggerMode: 'mention' | 'always';
  personality: 'balanced' | 'concise' | 'friendly' | 'sarcastic' | 'professional' | 'custom';
  systemPrompt: string;
  creativity: number;
  replyLength: 'short' | 'medium' | 'long';
  memoryEnabled: boolean;
  memoryDepth: number;
  rateLimitPerHour: number;
  blockedTopics: string[];
};

const PERSONALITIES: {
  value: AiSettings['personality'];
  name: string;
  description: string;
  sample: string;
}[] = [
  {
    value: 'balanced',
    name: 'Balanced',
    description: 'Neutral tone, answers the question, keeps it short.',
    sample: 'The queue is empty. Add a track with /play and I will start it.',
  },
  {
    value: 'concise',
    name: 'Concise',
    description: 'Cuts every sentence that is not doing work.',
    sample: 'Queue empty. /play to start.',
  },
  {
    value: 'friendly',
    name: 'Friendly',
    description: 'Warm, casual, happy to explain twice.',
    sample: 'Nothing queued yet. Drop a link with /play and I will get it going.',
  },
  {
    value: 'sarcastic',
    name: 'Sarcastic',
    description: 'Dry humour, never cruel.',
    sample: 'An empty queue. Bold strategy. /play adds a track.',
  },
  {
    value: 'professional',
    name: 'Professional',
    description: 'Clear, factual, no slang.',
    sample: 'The queue is currently empty. Use /play to add a track.',
  },
  {
    value: 'custom',
    name: 'Custom',
    description: 'You write the instructions. The prompt below is used verbatim.',
    sample: 'Whatever your prompt describes.',
  },
];

const LENGTHS = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long' },
];

export function AiChatView({ guildId }: { guildId: string }) {
  const settings = useGuildSettings<AiSettings>(guildId, 'ai');
  const { channels } = useDiscordMeta(guildId);
  const [topic, setTopic] = React.useState('');

  const premium = useQuery({
    queryKey: ['premium', guildId],
    queryFn: () => api.get<PremiumResponse>(`/api/guilds/${guildId}/premium`),
  });

  const draft = settings.draft;

  const addTopic = () => {
    if (!draft) return;
    const value = topic.trim().toLowerCase();
    if (!value) return;
    if (draft.blockedTopics.includes(value)) {
      setTopic('');
      return;
    }
    if (draft.blockedTopics.length >= 50) {
      toast.error('The blocked list is capped at 50 topics.');
      return;
    }
    settings.update({ blockedTopics: [...draft.blockedTopics, value] });
    setTopic('');
  };

  const usage = premium.data?.aiUsage;

  return (
    <div className="mx-auto w-full max-w-shell space-y-5 pb-16">
      <PageHeader
        title="AI Chat"
        description="Replies in the channels you choose, with a personality you define."
        icon={<Sparkles />}
        action={
          <Badge tone={draft?.enabled ? 'emerald' : 'neutral'}>
            <Bot className="size-3" />
            {draft?.enabled ? 'Enabled' : 'Off'}
          </Badge>
        }
      />

      {settings.isLoading || !draft ? (
        <SectionCard title="Assistant" description="Loading the current configuration" icon={<Bot />}>
          <FormSkeleton rows={6} />
        </SectionCard>
      ) : settings.error ? (
        <Notice tone="danger" title="Could not load AI settings">
          {settings.error instanceof Error ? settings.error.message : 'Reload the page to try again.'}
        </Notice>
      ) : premium.data && !premium.data.active ? (
        <SectionCard
          title="AI chat is a Premium feature"
          description="Upgrade this server to configure the assistant, set its personality and track usage."
          icon={<Sparkles />}
        >
          <p className="max-w-2xl text-sm leading-relaxed text-mist-dim">
            The free plan keeps music, radio, moderation, auto-mod, leveling and the dashboard. AI chat,
            scheduled tasks and unlimited auto-mod rules come with Premium. Nothing is charged from this
            page — the Premium page shows the current status for this server.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/dashboard/${guildId}/premium`}>See Premium for this server</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/pricing">Compare plans</Link>
            </Button>
          </div>
        </SectionCard>
      ) : (
        <>
          <SectionCard
            title="Where it replies"
            description="The assistant only reads messages in the channels listed here."
            icon={<MessageSquareText />}
          >
            <SettingRow
              label="Enable AI chat"
              description="Turning this off leaves the configuration intact."
            >
              <Switch
                checked={draft.enabled}
                onCheckedChange={(checked) => settings.update({ enabled: checked })}
                aria-label="Enable AI chat"
              />
            </SettingRow>

            <SettingRow
              label="Channels"
              description="Pick the channels it can answer in. Up to 25."
              htmlFor="ai-channels"
            >
              <MultiPicker
                id="ai-channels"
                values={draft.channels}
                onChange={(next) => settings.update({ channels: next })}
                options={(channels.data?.text ?? []).map((channel) => ({
                  value: channel.id,
                  label: `# ${channel.name}`,
                }))}
                placeholder="No channels selected"
                loading={channels.isLoading}
                error={channels.isError ? 'Channels are unavailable right now.' : null}
                max={25}
              />
            </SettingRow>

            <SettingRow label="When it responds" description="Mentions only, or every message.">
              <div className="inline-flex rounded-sm border border-hairline bg-void/40 p-0.5">
                {(['mention', 'always'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => settings.update({ triggerMode: mode })}
                    className={cn(
                      'cursor-pointer rounded-[3px] px-3 py-1.5 text-xs capitalize transition-colors',
                      draft.triggerMode === mode
                        ? 'bg-obsidian-raised text-mist shadow-inner-top'
                        : 'text-mist-faint hover:text-mist',
                    )}
                  >
                    {mode === 'mention' ? 'On mention' : 'Every message'}
                  </button>
                ))}
              </div>
            </SettingRow>

            {channels.isError && (
              <Notice tone="warning" title="Channel list unavailable">
                Discord did not return the channel list. Reload to try again.
              </Notice>
            )}
          </SectionCard>

          <SectionCard
            title="Personality"
            description="How it sounds. Pick a preset or write your own instructions."
            icon={<Wand2 />}
          >
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {PERSONALITIES.map((personality) => {
                const active = draft.personality === personality.value;
                return (
                  <button
                    key={personality.value}
                    type="button"
                    onClick={() => settings.update({ personality: personality.value })}
                    aria-pressed={active}
                    className={cn(
                      'cursor-pointer rounded-md border p-3 text-left transition-colors',
                      active
                        ? 'border-emerald/40 bg-emerald/[0.06]'
                        : 'border-hairline bg-void/40 hover:border-white/[0.14]',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className={cn('text-xs font-semibold', active ? 'text-emerald' : 'text-mist')}>
                        {personality.name}
                      </p>
                      {active && <span className="size-1.5 rounded-full bg-emerald shadow-glow-sm" />}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-mist-faint">
                      {personality.description}
                    </p>
                    <p className="mt-2 rounded-sm border border-hairline bg-void/60 px-2 py-1.5 text-[10px] italic leading-relaxed text-mist-dim">
                      &ldquo;{personality.sample}&rdquo;
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-3">
              <label htmlFor="ai-prompt" className="mb-1 block text-xs font-medium text-mist-dim">
                {draft.personality === 'custom' ? 'Instructions' : 'Extra instructions (optional)'}
              </label>
              <Textarea
                id="ai-prompt"
                value={draft.systemPrompt}
                onChange={(event) => settings.update({ systemPrompt: event.target.value })}
                placeholder="Keep replies under three sentences. Never give medical or legal advice."
                rows={4}
                maxLength={2000}
              />
              <p className="mt-1 text-right text-[10px] tabular text-mist-faint">
                {draft.systemPrompt.length}/2000
              </p>
            </div>
          </SectionCard>

          <SectionCard title="Response shape" description="Tone controls, not a personality change." icon={<Gauge />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="ai-creativity" className="text-xs font-medium text-mist-dim">
                    Creativity
                  </label>
                  <span className="font-mono text-[11px] tabular text-mist">{draft.creativity}</span>
                </div>
                <Slider
                  id="ai-creativity"
                  value={[draft.creativity]}
                  onValueChange={([value]) => settings.update({ creativity: value })}
                  min={0}
                  max={100}
                  step={5}
                  aria-label="Creativity"
                />
                <div className="mt-1 flex justify-between text-[10px] text-mist-faint">
                  <span>Predictable</span>
                  <span>Varied</span>
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium text-mist-dim">Reply length</p>
                <div className="inline-flex rounded-sm border border-hairline bg-void/40 p-0.5">
                  {LENGTHS.map((length) => (
                    <button
                      key={length.value}
                      type="button"
                      onClick={() =>
                        settings.update({ replyLength: length.value as AiSettings['replyLength'] })
                      }
                      className={cn(
                        'cursor-pointer rounded-[3px] px-3 py-1.5 text-xs transition-colors',
                        draft.replyLength === length.value
                          ? 'bg-obsidian-raised text-mist shadow-inner-top'
                          : 'text-mist-faint hover:text-mist',
                      )}
                    >
                      {length.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Memory and limits" description="What it remembers, and how often it answers." icon={<Brain />}>
            <SettingRow
              label="Remember the conversation"
              description="Keeps the last few messages per channel so follow-ups make sense."
            >
              <Switch
                checked={draft.memoryEnabled}
                onCheckedChange={(checked) => settings.update({ memoryEnabled: checked })}
                aria-label="Remember the conversation"
              />
            </SettingRow>

            {draft.memoryEnabled && (
              <SettingRow
                label="Messages remembered"
                description="Higher depth costs more tokens per reply."
                htmlFor="memory-depth"
              >
                <Input
                  id="memory-depth"
                  type="number"
                  min={0}
                  max={50}
                  value={draft.memoryDepth}
                  onChange={(event) =>
                    settings.update({ memoryDepth: Number(event.target.value) || 0 })
                  }
                  className="h-9 text-sm"
                />
              </SettingRow>
            )}

            <SettingRow
              label="Replies per hour"
              description="Per channel. Anything over the limit is ignored until the hour rolls over."
              htmlFor="ai-rate"
            >
              <Input
                id="ai-rate"
                type="number"
                min={1}
                max={100}
                value={draft.rateLimitPerHour}
                onChange={(event) =>
                  settings.update({ rateLimitPerHour: Number(event.target.value) || 1 })
                }
                className="h-9 text-sm"
              />
            </SettingRow>

            {usage && (
              <div className="mt-2 rounded-sm border border-hairline bg-void/40 p-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-mist-dim">Monthly replies</span>
                  <span className="font-mono tabular text-mist">
                    {usage.used} / {usage.quota}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-emerald"
                    style={{ width: `${Math.min(100, (usage.used / Math.max(1, usage.quota)) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Blocked topics"
            description="If a message is clearly about one of these, the assistant declines."
            icon={<Brain />}
          >
            <div className="flex gap-2">
              <Input
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addTopic();
                  }
                }}
                placeholder="Type a topic and press Enter"
                aria-label="Add a blocked topic"
                maxLength={48}
              />
              <Button type="button" variant="outline" onClick={addTopic} disabled={!topic.trim()}>
                <Plus className="size-4" />
                Add
              </Button>
            </div>

            {draft.blockedTopics.length === 0 ? (
              <p className="mt-2 text-[11px] text-mist-faint">
                No blocked topics. The assistant answers everything it is allowed to answer.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {draft.blockedTopics.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 rounded-full border border-hairline bg-white/[0.04] py-0.5 pl-2.5 pr-1 text-[11px] text-mist-dim"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() =>
                        settings.update({
                          blockedTopics: draft.blockedTopics.filter((value) => value !== item),
                        })
                      }
                      aria-label={`Remove ${item}`}
                      className="cursor-pointer rounded-full p-0.5 text-mist-faint hover:text-danger"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </SectionCard>
        </>
      )}

      <SaveBar
        visible={settings.dirty}
        saving={settings.saving}
        onSave={settings.save}
        onReset={settings.reset}
      />
    </div>
  );
}
