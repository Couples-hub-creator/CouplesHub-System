'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Layers, Lock, Sparkles } from 'lucide-react';
import { api, type PremiumResponse } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { SaveBar } from '@/components/ui/save-bar';
import { FormSkeleton, Notice, SectionCard } from '@/components/dashboard/kit';
import { ModuleIcon } from '@/components/dashboard/module-icon';
import { ModuleSchemaForm } from '@/components/dashboard/module-schema-form';
import { ModuleDataSection } from '@/components/dashboard/module-data-tables';
import { useModuleConfig } from '@/lib/hooks/use-module-config';
import { useDiscordMeta } from '@/lib/hooks/use-settings';

export function ModuleDetailView({
  guildId,
  moduleId,
}: {
  guildId: string;
  moduleId: string;
}) {
  const config = useModuleConfig(guildId, moduleId);
  const meta = useDiscordMeta(guildId);
  const moduleEntry = config.moduleEntry;

  const premium = useQuery({
    queryKey: ['premium', guildId],
    queryFn: () => api.get<PremiumResponse>(`/api/guilds/${guildId}/premium`),
    enabled: Boolean(moduleEntry?.premium),
    staleTime: 60_000,
  });

  const channels = meta.channels.data ?? { text: [], voice: [], categories: [] };
  const roles = meta.roles.data ?? [];

  if (config.isLoading) {
    return (
      <div className="mx-auto w-full max-w-shell space-y-5 pb-16">
        <SectionCard title="Loading module" description="Reading the module catalog from the bot.">
          <FormSkeleton rows={6} />
        </SectionCard>
      </div>
    );
  }

  if (config.error) {
    return (
      <div className="mx-auto w-full max-w-shell space-y-5 pb-16">
        <PageHeader
          title="Module"
          description="The bot catalog could not be loaded."
          icon={<Layers />}
        />
        <ErrorState
          title="Could not load the module"
          description={
            config.error instanceof Error ? config.error.message : 'Try again in a moment.'
          }
          onRetry={() => void config.refetch()}
        />
      </div>
    );
  }

  if (!moduleEntry) {
    return (
      <div className="mx-auto w-full max-w-shell space-y-5 pb-16">
        <PageHeader
          title="Module not found"
          description="That module is not loaded on the bot."
          icon={<Layers />}
        />
        <EmptyState
          icon={<Layers />}
          title="Nothing here"
          description="The module may have been renamed or removed from the bot build."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/${guildId}/modules`}>Back to modules</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const premiumLocked =
    moduleEntry.premium && premium.data !== undefined && premium.data.active === false;

  return (
    <div className="mx-auto w-full max-w-shell space-y-5 pb-16">
      <PageHeader
        title={moduleEntry.name}
        description={moduleEntry.description}
        icon={<ModuleIcon name={moduleEntry.icon} />}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge tone="neutral">{moduleEntry.category}</Badge>
            {moduleEntry.premium && (
              <Badge tone="champagne">
                <Sparkles className="size-3" />
                Premium
              </Badge>
            )}
            <Badge tone={moduleEntry.configured ? 'emerald' : 'neutral'}>
              {moduleEntry.configured ? 'Configured' : 'Using defaults'}
            </Badge>
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/${guildId}/modules`}>
                <ArrowLeft className="size-3.5" />
                Modules
              </Link>
            </Button>
          </div>
        }
      />

      {premiumLocked ? (
        <SectionCard
          title={`${moduleEntry.name} is part of Premium`}
          description="This module is loaded, but its configuration is locked on the free plan."
          icon={<Lock />}
        >
          <p className="max-w-2xl text-sm leading-relaxed text-mist-dim">
            The server keeps its existing settings. Upgrade to change them, or open the Premium page
            to see the current plan and usage for this server.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/dashboard/${guildId}/premium`}>See Premium</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/pricing">Compare plans</Link>
            </Button>
          </div>
        </SectionCard>
      ) : !moduleEntry.supportsConfig ? (
        <Notice tone="info" title="This module has no stored configuration">
          Its controls live on a dedicated page. Open the module from the catalog to reach it.
        </Notice>
      ) : config.draft ? (
        <ModuleSchemaForm
          sections={moduleEntry.ui.sections}
          config={config.draft}
          onChange={(key, value) => config.update({ [key]: value })}
          channels={channels}
          roles={roles}
          idPrefix={moduleId}
        />
      ) : null}

      <ModuleDataSection guildId={guildId} moduleId={moduleId} />

      {!premiumLocked && (
        <SaveBar
          visible={config.dirty}
          saving={config.saving}
          onSave={config.save}
          onReset={config.reset}
          label="Save module settings"
        />
      )}
    </div>
  );
}
