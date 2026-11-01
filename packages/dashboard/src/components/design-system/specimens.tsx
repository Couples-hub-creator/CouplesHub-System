'use client';

import * as React from 'react';
import { ArrowUpRight, Check, Command, Crown, Music4, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge, StatusDot } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Progress, ProgressRing } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyButton } from '@/components/ui/copy-button';
import { SectionCard, SettingRow } from '@/components/dashboard/kit';

const COLORS = [
  { name: 'Void', token: 'bg-void', value: '#05070C', note: 'Page background' },
  { name: 'Obsidian', token: 'bg-obsidian', value: '#0A0F18', note: 'Panels' },
  { name: 'Obsidian raised', token: 'bg-obsidian-raised', value: '#111926', note: 'Popovers, inputs' },
  { name: 'Hairline', token: 'border-hairline', value: 'rgba(255,255,255,0.07)', note: 'Borders' },
  { name: 'Emerald', token: 'bg-emerald', value: '#19D68F', note: 'Primary action' },
  { name: 'Emerald deep', token: 'bg-emerald-deep', value: '#0B7A55', note: 'Pressed, tinted' },
  { name: 'Champagne', token: 'bg-champagne', value: '#E9C985', note: 'Premium' },
  { name: 'Mist', token: 'bg-mist', value: '#E8EDF5', note: 'Primary text' },
  { name: 'Mist dim', token: 'bg-mist-dim', value: '#93A0B5', note: 'Body text' },
  { name: 'Mist faint', token: 'bg-mist-faint', value: '#6F7B93', note: 'Meta text' },
  { name: 'Danger', token: 'bg-danger', value: '#FF5C7A', note: 'Destructive' },
  { name: 'Warning', token: 'bg-warning', value: '#FFB84D', note: 'Caution' },
  { name: 'Info', token: 'bg-info', value: '#5CC8FF', note: 'Neutral notice' },
];

const TYPE = [
  { label: 'display-1', className: 'font-display text-display-1 font-semibold', sample: 'Discord, in command' },
  { label: 'display-2', className: 'font-display text-display-2 font-semibold', sample: 'The command room' },
  { label: 'title-1', className: 'font-display text-title-1 font-semibold', sample: 'Section heading' },
  { label: 'title-2', className: 'font-display text-title-2 font-semibold', sample: 'Card heading' },
  { label: 'body', className: 'text-base leading-relaxed text-mist-dim', sample: 'Instrument Sans carries the interface. Set at 15–16px with relaxed leading.' },
  { label: 'eyebrow', className: 'text-eyebrow font-semibold uppercase text-emerald', sample: 'Section label' },
  { label: 'mono', className: 'font-mono text-sm text-mist-dim', sample: '/play https://example.com/track' },
];

const VARIANTS = ['primary', 'champagne', 'outline', 'ghost', 'subtle', 'danger', 'discord', 'link'] as const;

function SpecimensInner() {
  const [checked, setChecked] = React.useState(true);
  const [volume, setVolume] = React.useState([64]);

  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-display text-title-1 font-semibold text-mist">Colour</h2>
        <p className="mt-1 text-sm text-mist-dim">Crown Jewel tokens. Never hardcode a hex in a component.</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {COLORS.map((color) => (
            <div key={color.name} className="overflow-hidden rounded-md border border-hairline bg-obsidian/40">
              <div
                className="h-16 w-full border-b border-hairline"
                style={
                  color.name === 'Hairline'
                    ? { background: 'rgba(255,255,255,0.07)' }
                    : { background: color.value }
                }
              />
              <div className="p-2.5">
                <p className="text-xs font-semibold text-mist">{color.name}</p>
                <p className="mt-0.5 font-mono text-[10px] text-mist-faint">{color.value}</p>
                <p className="mt-1 text-[10px] text-mist-dim">{color.note}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-title-1 font-semibold text-mist">Typography</h2>
        <p className="mt-1 text-sm text-mist-dim">
          Bricolage Grotesque for display, Instrument Sans for UI, JetBrains Mono for code.
        </p>
        <div className="mt-4 divide-y divide-white/[0.05] overflow-hidden rounded-lg border border-hairline bg-obsidian/40">
          {TYPE.map((row) => (
            <div key={row.label} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-baseline sm:gap-6">
              <code className="w-24 shrink-0 font-mono text-[10px] text-mist-faint">{row.label}</code>
              <p className={row.className}>{row.sample}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-title-1 font-semibold text-mist">Buttons</h2>
        <p className="mt-1 text-sm text-mist-dim">One primary action per view. Labels say exactly what happens.</p>
        <div className="mt-4 space-y-4 rounded-lg border border-hairline bg-obsidian/40 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {VARIANTS.map((variant) => (
              <Button key={variant} variant={variant} size="sm" type="button">
                {variant === 'primary' ? 'Save changes' : variant === 'danger' ? 'Delete task' : variant}
                {variant === 'primary' && <ArrowUpRight className="size-3.5" />}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" type="button">Small</Button>
            <Button size="md" type="button">Medium</Button>
            <Button size="lg" type="button">Large</Button>
            <Button size="sm" type="button" loading>Saving</Button>
            <Button size="sm" type="button" disabled>Disabled</Button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-display text-title-1 font-semibold text-mist">Status and badges</h2>
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-hairline bg-obsidian/40 p-4">
          <Badge tone="emerald"><Check className="size-3" />Operational</Badge>
          <Badge tone="champagne"><Crown className="size-3" />Premium</Badge>
          <Badge tone="warning">Degraded</Badge>
          <Badge tone="danger">Outage</Badge>
          <Badge tone="info">Info</Badge>
          <Badge tone="neutral">Neutral</Badge>
          <Badge tone="emerald" solid>Solid</Badge>
          <span className="ml-2 inline-flex items-center gap-1.5 text-xs text-mist-dim">
            <StatusDot tone="emerald" pulse /> Live
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-mist-dim">
            <StatusDot tone="warning" /> Paused
          </span>
        </div>
      </section>

      <section>
        <h2 className="font-display text-title-1 font-semibold text-mist">Form controls</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-lg border border-hairline bg-obsidian/40 p-4">
            <div>
              <label htmlFor="spec-input" className="mb-1 block text-xs font-medium text-mist-dim">
                Text input
              </label>
              <Input id="spec-input" placeholder="Search commands" />
            </div>
            <div>
              <label htmlFor="spec-error" className="mb-1 block text-xs font-medium text-mist-dim">
                Invalid state
              </label>
              <Input id="spec-error" defaultValue="not-a-url" error="Enter a full URL starting with https://" />
            </div>
            <div>
              <label htmlFor="spec-textarea" className="mb-1 block text-xs font-medium text-mist-dim">
                Textarea
              </label>
              <Textarea id="spec-textarea" rows={3} placeholder="Welcome to {server}, {user}." />
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-hairline bg-obsidian/40 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-mist">Switch</p>
                <p className="text-[11px] text-mist-faint">Boolean settings apply instantly.</p>
              </div>
              <Switch checked={checked} onCheckedChange={setChecked} aria-label="Example switch" />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-xs font-medium text-mist">Slider</p>
                <span className="font-mono text-[11px] tabular text-mist">{volume[0]}%</span>
              </div>
              <Slider value={volume} onValueChange={setVolume} min={0} max={100} step={1} aria-label="Volume" />
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium text-mist">Progress</p>
              <Progress value={62} />
            </div>

            <div className="flex items-center gap-3">
              <ProgressRing value={72} size={44} />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="mt-2 h-3 w-1/3" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Input value="!play lofi" readOnly className="font-mono text-xs" aria-label="Copy example" />
              <CopyButton value="!play lofi" label="Copy example" size="icon-sm" />
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-display text-title-1 font-semibold text-mist">Surfaces</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="glass rounded-lg p-4">
            <p className="text-sm font-semibold text-mist">Glass</p>
            <p className="mt-1 text-xs leading-relaxed text-mist-dim">
              Backdrop blur over the void. Used for floating navigation and overlays.
            </p>
          </div>
          <div className="rounded-lg border border-hairline bg-obsidian/60 p-4">
            <p className="text-sm font-semibold text-mist">Panel</p>
            <p className="mt-1 text-xs leading-relaxed text-mist-dim">
              The default surface. Obsidian at 60% with a hairline border.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-hairline bg-obsidian/60 p-4">
            <span className="gem size-10"><Command /></span>
            <span className="gem size-10"><Music4 /></span>
            <span className="gem size-10"><ShieldCheck /></span>
            <span className="gem size-10"><Sparkles /></span>
            <div>
              <p className="text-sm font-semibold text-mist">Gem tiles</p>
              <p className="text-xs text-mist-dim">One icon per surface, no emoji.</p>
            </div>
          </div>
          <SectionCard title="Section card" description="The dashboard workhorse." icon={<Search />}>
            <SettingRow label="A setting" description="Label, explanation, control on the right.">
              <Switch checked={checked} onCheckedChange={setChecked} aria-label="Section example" />
            </SettingRow>
          </SectionCard>
        </div>
      </section>
    </div>
  );
}

export function DesignSpecimens() {
  return <SpecimensInner />;
}
