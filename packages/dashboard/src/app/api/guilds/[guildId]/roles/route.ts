import { z } from 'zod';
import { withHandler, readJson } from '@/lib/server/api';
import { requireGuildAccess, ensureGuild, ApiError } from '@/lib/server/auth';
import { rateLimit } from '@/lib/server/rate-limit';
import { publish } from '@/lib/server/realtime';
import { prisma } from '@/lib/prisma';
import { buttonRoleSchema, reactionRoleSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

type Ctx = { params: { guildId: string } };

const createSchema = z.union([
  reactionRoleSchema.extend({ kind: z.literal('reaction') }),
  buttonRoleSchema.extend({ kind: z.literal('button') }),
]);

export const GET = withHandler<Ctx>(async (_request, { params }) => {
  await requireGuildAccess(params.guildId);

  const [reactionRoles, buttonRoles] = await Promise.all([
    prisma.reactionRole.findMany({
      where: { guildId: params.guildId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.buttonRole.findMany({
      where: { guildId: params.guildId },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    reactionRoles: reactionRoles.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    buttonRoles: buttonRoles.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
  };
});

export const POST = withHandler<Ctx>(async (request, { params }) => {
  const access = await requireGuildAccess(params.guildId);

  const limit = rateLimit(`roles:${access.userDiscordId}:${params.guildId}`, 30, 60_000);
  if (!limit.ok) {
    throw new ApiError(429, 'Too many role mappings in a minute. Wait and try again.', 'RATE_LIMITED');
  }

  const input = await readJson(request, createSchema);
  await ensureGuild(params.guildId);

  if (input.kind === 'reaction') {
    const created = await prisma.reactionRole.create({
      data: {
        guildId: params.guildId,
        channelId: input.channelId,
        messageId: input.messageId,
        emoji: input.emoji,
        roleId: input.roleId,
      },
    });
    await prisma.dashboardAudit.create({
      data: {
        guildId: params.guildId,
        actorId: access.userDiscordId,
        action: 'roles.reaction.create',
        target: created.id,
      },
    });
    await publish(params.guildId, 'settings:updated', { module: 'roles', kind: 'reaction' });
    return { reactionRole: { ...created, createdAt: created.createdAt.toISOString() } };
  }

  const created = await prisma.buttonRole.create({
    data: {
      guildId: params.guildId,
      channelId: input.channelId,
      messageId: input.messageId,
      label: input.label,
      style: input.style,
      roleId: input.roleId,
    },
  });
  await prisma.dashboardAudit.create({
    data: {
      guildId: params.guildId,
      actorId: access.userDiscordId,
      action: 'roles.button.create',
      target: created.id,
    },
  });
  await publish(params.guildId, 'settings:updated', { module: 'roles', kind: 'button' });
  return { buttonRole: { ...created, createdAt: created.createdAt.toISOString() } };
});

export const DELETE = withHandler<Ctx>(async (request, { params }) => {
  const access = await requireGuildAccess(params.guildId);

  const limit = rateLimit(`roles:${access.userDiscordId}:${params.guildId}`, 30, 60_000);
  if (!limit.ok) {
    throw new ApiError(429, 'Too many role mappings in a minute. Wait and try again.', 'RATE_LIMITED');
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const kind = url.searchParams.get('kind');
  if (!id || (kind !== 'reaction' && kind !== 'button')) {
    throw new ApiError(400, 'Pick a mapping to delete.', 'MISSING_ID');
  }

  if (kind === 'reaction') {
    const row = await prisma.reactionRole.findFirst({ where: { id, guildId: params.guildId } });
    if (!row) throw new ApiError(404, 'That mapping does not exist.', 'NOT_FOUND');
    await prisma.reactionRole.delete({ where: { id: row.id } });
  } else {
    const row = await prisma.buttonRole.findFirst({ where: { id, guildId: params.guildId } });
    if (!row) throw new ApiError(404, 'That mapping does not exist.', 'NOT_FOUND');
    await prisma.buttonRole.delete({ where: { id: row.id } });
  }

  await prisma.dashboardAudit.create({
    data: {
      guildId: params.guildId,
      actorId: access.userDiscordId,
      action: `roles.${kind}.delete`,
      target: id,
    },
  });

  await publish(params.guildId, 'settings:updated', { module: 'roles', kind, deleted: id });

  return { deleted: id };
});
