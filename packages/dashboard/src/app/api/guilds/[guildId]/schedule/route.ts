import { withHandler, readJson } from '@/lib/server/api';
import { requireGuildAccess, ensureGuild, ApiError } from '@/lib/server/auth';
import { rateLimit } from '@/lib/server/rate-limit';
import { nextRun } from '@/lib/server/schedule';
import { requirePremium } from '@/lib/server/premium';
import { prisma } from '@/lib/prisma';
import { scheduleTaskSchema, schedulePatchSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

type Ctx = { params: { guildId: string } };

export const GET = withHandler<Ctx>(async (_request, { params }) => {
  await requireGuildAccess(params.guildId);

  const tasks = await prisma.scheduleTask.findMany({
    where: { guildId: params.guildId },
    orderBy: [{ enabled: 'desc' }, { nextRunAt: 'asc' }],
    include: { runs: { orderBy: { ranAt: 'desc' }, take: 5 } },
  });

  return {
    tasks: tasks.map((task) => ({
      id: task.id,
      name: task.name,
      kind: task.kind,
      payload: task.payload,
      channelId: task.channelId,
      recurrence: task.recurrence,
      cron: task.cron,
      runAt: task.runAt?.toISOString() ?? null,
      timezone: task.timezone,
      enabled: task.enabled,
      lastRunAt: task.lastRunAt?.toISOString() ?? null,
      nextRunAt: task.nextRunAt?.toISOString() ?? null,
      runs: task.runs.map((run) => ({
        id: run.id,
        status: run.status,
        detail: run.detail,
        ranAt: run.ranAt.toISOString(),
      })),
    })),
  };
});

export const POST = withHandler<Ctx>(async (request, { params }) => {
  const access = await requireGuildAccess(params.guildId);
  await requirePremium(params.guildId);
  const limit = rateLimit(`schedule:${access.userDiscordId}`, 20, 60_000);
  if (!limit.ok) throw new ApiError(429, 'Too many schedule changes. Wait and try again.', 'RATE_LIMITED');

  const input = await readJson(request, scheduleTaskSchema);
  await ensureGuild(params.guildId);

  const runAt = input.runAt ? new Date(input.runAt) : null;
  const next = nextRun(input.recurrence, new Date(), { runAt, cron: input.cron });

  const task = await prisma.scheduleTask.create({
    data: {
      guildId: params.guildId,
      name: input.name,
      kind: input.kind,
      payload: input.payload,
      channelId: input.channelId ?? null,
      recurrence: input.recurrence,
      cron: input.cron ?? null,
      runAt,
      timezone: input.timezone,
      enabled: input.enabled,
      nextRunAt: next,
    },
  });

  await prisma.dashboardAudit.create({
    data: {
      guildId: params.guildId,
      actorId: access.userDiscordId,
      action: 'schedule.create',
      target: task.id,
    },
  });

  return {
    task: {
      ...task,
      runAt: task.runAt?.toISOString() ?? null,
      nextRunAt: task.nextRunAt?.toISOString() ?? null,
    },
  };
});

export const PATCH = withHandler<Ctx>(async (request, { params }) => {
  const access = await requireGuildAccess(params.guildId);
  await requirePremium(params.guildId);
  const limit = rateLimit(`schedule:${access.userDiscordId}`, 20, 60_000);
  if (!limit.ok) throw new ApiError(429, 'Too many schedule changes. Wait and try again.', 'RATE_LIMITED');

  const body = await readJson(request, schedulePatchSchema);

  const task = await prisma.scheduleTask.findFirst({ where: { id: body.id, guildId: params.guildId } });
  if (!task) throw new ApiError(404, 'That task does not exist in this server.', 'NOT_FOUND');

  if ('input' in body) {
    const input = body.input;
    const runAt = input.runAt ? new Date(input.runAt) : null;
    const next = input.enabled
      ? nextRun(input.recurrence, new Date(), { runAt, cron: input.cron })
      : null;

    const updated = await prisma.scheduleTask.update({
      where: { id: task.id },
      data: {
        name: input.name,
        kind: input.kind,
        payload: input.payload,
        channelId: input.channelId ?? null,
        recurrence: input.recurrence,
        cron: input.cron ?? null,
        runAt,
        timezone: input.timezone,
        enabled: input.enabled,
        nextRunAt: next,
      },
    });

    await prisma.dashboardAudit.create({
      data: {
        guildId: params.guildId,
        actorId: access.userDiscordId,
        action: 'schedule.update',
        target: task.id,
      },
    });

    return {
      task: {
        ...updated,
        runAt: updated.runAt?.toISOString() ?? null,
        nextRunAt: updated.nextRunAt?.toISOString() ?? null,
      },
    };
  }

  if (body.action === 'toggle') {
    const enabled = !task.enabled;
    const next = enabled
      ? nextRun(task.recurrence, new Date(), { runAt: task.runAt, cron: task.cron })
      : null;
    const updated = await prisma.scheduleTask.update({
      where: { id: task.id },
      data: { enabled, nextRunAt: next },
    });
    return { task: { ...updated, enabled } };
  }

  if (body.action === 'run-now') {
    const run = await prisma.scheduleRun.create({
      data: { taskId: task.id, status: 'queued', detail: 'Queued from the dashboard' },
    });
    return { run: { ...run, ranAt: run.ranAt.toISOString() } };
  }

  throw new ApiError(400, 'Unknown schedule action.', 'BAD_ACTION');
});

export const DELETE = withHandler<Ctx>(async (request, { params }) => {
  const access = await requireGuildAccess(params.guildId);
  await requirePremium(params.guildId);
  const limit = rateLimit(`schedule:${access.userDiscordId}`, 20, 60_000);
  if (!limit.ok) throw new ApiError(429, 'Too many schedule changes. Wait and try again.', 'RATE_LIMITED');

  const id = new URL(request.url).searchParams.get('id');
  if (!id) throw new ApiError(400, 'A task id is required.', 'MISSING_ID');

  const task = await prisma.scheduleTask.findFirst({ where: { id, guildId: params.guildId } });
  if (!task) throw new ApiError(404, 'That task does not exist in this server.', 'NOT_FOUND');

  await prisma.scheduleTask.delete({ where: { id: task.id } });
  return { deleted: task.id };
});
