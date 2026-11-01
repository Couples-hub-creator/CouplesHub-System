import { withHandler, readJson } from '@/lib/server/api';
import { requireGuildAccess, ensureGuild, ApiError } from '@/lib/server/auth';
import { rateLimit } from '@/lib/server/rate-limit';
import { prisma } from '@/lib/prisma';
import { dangerSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

type Ctx = { params: { guildId: string } };

const ADMINISTRATOR = 0x8n;

function isAdministrator(permissions: string): boolean {
  try {
    const perms = BigInt(permissions);
    return (perms & ADMINISTRATOR) === ADMINISTRATOR;
  } catch {
    return false;
  }
}

export const POST = withHandler<Ctx>(async (request, { params }) => {
  const access = await requireGuildAccess(params.guildId);

  if (!access.guild.owner && !isAdministrator(access.guild.permissions)) {
    throw new ApiError(403, 'Only a server administrator can do that.', 'MISSING_PERMISSION');
  }

  const limit = rateLimit(`danger:${access.userDiscordId}:${params.guildId}`, 5, 60_000);
  if (!limit.ok) {
    throw new ApiError(429, 'Too many destructive requests. Wait a minute.', 'RATE_LIMITED');
  }

  const input = await readJson(request, dangerSchema);
  const expected = input.action === 'delete-guild-data' ? 'DELETE' : 'RESET';

  if (input.confirmation.trim() !== expected) {
    throw new ApiError(400, `Type ${expected} to confirm.`, 'CONFIRMATION_MISMATCH');
  }

  await ensureGuild(params.guildId);

  await prisma.dashboardAudit.create({
    data: {
      guildId: params.guildId,
      actorId: access.userDiscordId,
      action: `danger.${input.action}`,
    },
  });

  if (input.action === 'reset-modules') {
    await prisma.$transaction([
      prisma.guild.update({
        where: { guildId: params.guildId },
        data: {
          musicEnabled: true,
          moderationEnabled: true,
          autoModEnabled: true,
          welcomeEnabled: true,
          levelingEnabled: true,
          loggingEnabled: true,
        },
      }),
      prisma.autoModRule.deleteMany({ where: { guildId: params.guildId } }),
    ]);
  } else {
    // Cascades remove every guild-scoped row: settings, cases, logs, tasks,
    // stations, premium and dashboard audits.
    await prisma.guild.delete({ where: { guildId: params.guildId } });
  }

  return { done: true, action: input.action };
});
