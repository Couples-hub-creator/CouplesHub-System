import { CronExpressionParser } from 'cron-parser';
import type { BotClient } from '../../structures/BotClient';
import { logger } from '../../core/logger';

export function nextCronRun(expression: string, timezone: string, from = new Date()): Date | null {
  try {
    const interval = CronExpressionParser.parse(expression, { currentDate: from, tz: timezone });
    return interval.next().toDate();
  } catch {
    return null;
  }
}

export function buildCron(recurrence: string, time: string, day?: number | null, cron?: string | null): string | null {
  if (recurrence === 'cron') return cron?.trim() || null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) return null;
  const minute = Number(match[2]);
  const hour = Number(match[1]);
  if (recurrence === 'daily') return `${minute} ${hour} * * *`;
  if (recurrence === 'weekly') {
    const dow = day ?? 1;
    if (dow < 0 || dow > 6) return null;
    return `${minute} ${hour} * * ${dow}`;
  }
  if (recurrence === 'monthly') {
    const dom = day ?? 1;
    if (dom < 1 || dom > 31) return null;
    return `${minute} ${hour} ${dom} * *`;
  }
  return null;
}

export async function enqueueScheduleTask(client: BotClient, taskId: string): Promise<void> {
  const task = await client.prisma.scheduleTask.findUnique({ where: { id: taskId } });
  if (!task || !task.enabled || !task.nextRunAt) return;
  await client.scheduler.enqueue({
    type: 'schedule:run',
    guildId: task.guildId,
    payload: { taskId: task.id },
    runAt: task.nextRunAt,
    idempotencyKey: `schedule:${task.id}:${task.nextRunAt.toISOString()}`,
  });
}

export async function runScheduleTask(client: BotClient, taskId: string): Promise<'success' | 'failed' | 'skipped'> {
  const task = await client.prisma.scheduleTask.findUnique({ where: { id: taskId } });
  if (!task || !task.enabled) return 'skipped';
  const guild = client.guilds.cache.get(task.guildId);
  const channel = task.channelId ? guild?.channels.cache.get(task.channelId) : null;
  let status: 'success' | 'failed' | 'skipped' = 'success';
  let detail: string | null = null;
  if (!channel?.isTextBased()) {
    status = 'failed';
    detail = 'Channel missing or not text-based';
  } else {
    try {
      await channel.send({ content: task.payload.slice(0, 2000), allowedMentions: { parse: ['users', 'roles'] } });
    } catch (error) {
      status = 'failed';
      detail = error instanceof Error ? error.message : 'Unknown send error';
      logger.warn(`Scheduled task ${task.id} failed to send`, error);
    }
  }
  await client.prisma.scheduleRun.create({ data: { taskId: task.id, status, detail } });
  await client.prisma.scheduleTask.update({ where: { id: task.id }, data: { lastRunAt: new Date() } });

  if (task.recurrence === 'once') {
    await client.prisma.scheduleTask.update({ where: { id: task.id }, data: { enabled: false } });
    return status;
  }
  const next = task.cron ? nextCronRun(task.cron, task.timezone) : null;
  await client.prisma.scheduleTask.update({
    where: { id: task.id },
    data: { nextRunAt: next },
  });
  if (next) await enqueueScheduleTask(client, task.id);
  return status;
}

export async function syncSchedules(client: BotClient): Promise<void> {
  const tasks = await client.prisma.scheduleTask.findMany({ where: { enabled: true } });
  for (const task of tasks) {
    if (!task.nextRunAt) {
      const next = task.recurrence === 'once' ? task.runAt : task.cron ? nextCronRun(task.cron, task.timezone) : null;
      if (next) {
        await client.prisma.scheduleTask.update({ where: { id: task.id }, data: { nextRunAt: next } });
        await enqueueScheduleTask(client, task.id);
      }
      continue;
    }
    if (task.nextRunAt.getTime() < Date.now() - 60_000) {
      await runScheduleTask(client, task.id).catch((error) => logger.warn(`Missed schedule ${task.id} failed`, error));
      continue;
    }
    await enqueueScheduleTask(client, task.id);
  }
}
