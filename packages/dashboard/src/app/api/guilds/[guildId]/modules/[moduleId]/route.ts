import { withHandler, readJson } from '@/lib/server/api';
import { requireGuildAccess, ensureGuild, ApiError } from '@/lib/server/auth';
import { callBotApi } from '@/lib/server/bot-api';
import { requirePremium } from '@/lib/server/premium';
import { rateLimit } from '@/lib/server/rate-limit';
import { publish } from '@/lib/server/realtime';
import { prisma } from '@/lib/prisma';
import { moduleConfigSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

type Ctx = { params: { guildId: string; moduleId: string } };
type CatalogModule = { id: string; premium: boolean; supportsConfig: boolean };

export const PATCH = withHandler<Ctx>(async (request, { params }) => {
  const access = await requireGuildAccess(params.guildId);
  if (!/^[a-z0-9_-]{1,40}$/.test(params.moduleId)) {
    throw new ApiError(404, 'That entry does not exist.', 'UNKNOWN_MODULE');
  }

  const limit = rateLimit(`modules:${access.userDiscordId}:${params.guildId}`, 30, 60_000);
  if (!limit.ok) {
    throw new ApiError(429, 'Too many changes at once. Wait a moment and try again.', 'RATE_LIMITED');
  }

  const input = await readJson(request, moduleConfigSchema);
  const catalog = await callBotApi<{ modules: CatalogModule[] }>(
    'GET',
    `/guilds/${params.guildId}/modules/catalog`,
  );
  const entry = catalog.modules.find((item) => item.id === params.moduleId);
  if (!entry) throw new ApiError(404, 'That module is not loaded on the bot.', 'UNKNOWN_MODULE');
  if (!entry.supportsConfig) {
    throw new ApiError(400, 'That module is configured on its dedicated page.', 'NO_MODULE_CONFIG');
  }
  if (entry.premium) await requirePremium(params.guildId);

  await ensureGuild(params.guildId);

  const saved = await callBotApi<{ config: Record<string, unknown> }>(
    'PUT',
    `/guilds/${params.guildId}/modules/${params.moduleId}/config`,
    {
      config: input.config,
      actorId: access.userDiscordId,
    },
  );

  await prisma.dashboardAudit.create({
    data: {
      guildId: params.guildId,
      actorId: access.userDiscordId,
      action: `module.${params.moduleId}.update`,
    },
  });

  await publish(params.guildId, 'settings:updated', { module: params.moduleId });

  return saved;
});
