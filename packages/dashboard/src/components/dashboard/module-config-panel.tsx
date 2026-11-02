'use client';

import * as React from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/empty-state';
import { FormSkeleton } from '@/components/dashboard/kit';
import { ModuleSchemaForm } from '@/components/dashboard/module-schema-form';
import { useModuleConfig } from '@/lib/hooks/use-module-config';
import { useDiscordMeta } from '@/lib/hooks/use-settings';
import type { ModuleConfig } from '@/lib/modules/catalog';

/**
 * The remaining UI-schema fields for a module that already has a hand-built
 * page. It writes through the same signed module-config endpoint as the
 * generic module page, so there is only one source of truth per field.
 */
export function ModuleConfigPanel({
  guildId,
  moduleId,
  title = 'More module settings',
  description = 'The rest of this module’s schema. These values are stored in the module config and apply immediately after saving.',
  excludeKeys = [],
  saveLabel = 'Save module settings',
  children,
}: {
  guildId: string;
  moduleId: string;
  title?: string;
  description?: string;
  excludeKeys?: string[];
  saveLabel?: string;
  children?: (
    config: ModuleConfig,
    update: (patch: Partial<ModuleConfig>) => void,
  ) => React.ReactNode;
}) {
  const config = useModuleConfig(guildId, moduleId);
  const meta = useDiscordMeta(guildId);

  const excluded = new Set(excludeKeys);
  const visibleFields =
    config.moduleEntry?.ui.sections.reduce(
      (total, section) =>
        total + section.fields.filter((field) => !excluded.has(field.key)).length,
      0,
    ) ?? 0;

  if (!config.supportsConfig) return null;
  if (config.isLoading) {
    return (
      <div className="rounded-lg border border-hairline bg-obsidian/60 p-4">
        <FormSkeleton rows={4} />
      </div>
    );
  }
  if (config.error) {
    return (
      <ErrorState
        title="Could not load module settings"
        description={
          config.error instanceof Error ? config.error.message : 'Try again in a moment.'
        }
        onRetry={() => void config.refetch()}
      />
    );
  }
  if (!config.moduleEntry || !config.draft) return null;
  if (visibleFields === 0 && !children) return null;

  const channels = meta.channels.data ?? { text: [], voice: [], categories: [] };
  const roles = meta.roles.data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-title-3 font-semibold text-mist">{title}</h2>
        <p className="max-w-prose text-xs leading-relaxed text-mist-dim">{description}</p>
      </div>

      <ModuleSchemaForm
        sections={config.moduleEntry.ui.sections}
        config={config.draft}
        onChange={(key, value) => config.update({ [key]: value })}
        channels={channels}
        roles={roles}
        excludeKeys={excludeKeys}
        idPrefix={`${moduleId}-advanced`}
      />

      {children?.(config.draft, config.update)}

      <div className="flex flex-col gap-3 border-t border-hairline pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] text-mist-faint">
          {config.dirty
            ? 'You have unsaved module settings.'
            : 'Module settings are saved for this server.'}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={config.reset}
            disabled={!config.dirty || config.saving}
          >
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
          <Button
            size="sm"
            onClick={config.save}
            loading={config.saving}
            disabled={!config.dirty}
          >
            {!config.saving && <Save className="size-3.5" />}
            {saveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
