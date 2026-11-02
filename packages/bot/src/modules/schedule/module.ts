import type { BotModule } from '../../core/modules/types';
import { ScheduleCommand } from './command';
import { scheduleConfigDef } from './config';
import { runScheduleTask, syncSchedules } from './service';
import { logger } from '../../core/logger';

const schedule: BotModule = {
  manifest: {
    id: 'schedule',
    name: 'Scheduler',
    icon: 'calendar',
    category: 'Automation',
    description: 'One-time and recurring scheduled messages with cron, timezones, pause/resume and run history.',
    premium: false,
    requiredIntents: ['Guilds'],
    requiredPermissions: ['ViewChannel', 'SendMessages'],
    commands: ['schedule'],
    events: [],
    configVersion: 1,
    ui: {
      sections: [
        {
          id: 'schedule',
          title: 'Scheduler',
          fields: [
            { key: 'enabled', type: 'toggle', label: 'Enable scheduled messages' },
            { key: 'maxTasks', type: 'number', label: 'Maximum tasks per server', min: 1, max: 200 },
            { key: 'defaultTimezone', type: 'text', label: 'Default IANA timezone', placeholder: 'UTC' },
            { key: 'deleteCompleted', type: 'toggle', label: 'Delete completed one-time tasks' },
          ],
        },
      ],
    },
  },
  config: scheduleConfigDef,
  commands: [ScheduleCommand],
  setup: (ctx) => {
    ctx.scheduler.register('schedule:run', async (job) => {
      const payload = (job.payload ?? {}) as { taskId?: string };
      if (!payload.taskId) return;
      await runScheduleTask(ctx.client, payload.taskId).catch((error) =>
        logger.warn(`Scheduled task ${payload.taskId} failed`, error),
      );
    });
    setTimeout(() => {
      void syncSchedules(ctx.client).catch((error) => logger.warn('Schedule sync failed', error));
    }, 5_000).unref?.();
  },
  actions: {
    run: async (ctx) => {
      const id = String(ctx.payload.id ?? '');
      if (!id) throw new Error('id is required');
      const status = await runScheduleTask(ctx.client, id);
      return { status };
    },
    list: async (ctx) => {
      const tasks = await ctx.client.prisma.scheduleTask.findMany({ where: { guildId: ctx.guildId } });
      return { tasks };
    },
  },
};

export default schedule;
