import type { BotModule } from '../../core/modules/types';
import { ReminderCommand } from './command';
import { loadReminderConfig, reminderConfigDef } from './config';
import { logger } from '../../core/logger';

const reminders: BotModule = {
  manifest: {
    id: 'reminders',
    name: 'Reminders',
    icon: 'clock',
    category: 'Utility',
    description: 'Persistent personal reminders delivered in the original channel or by DM after a restart.',
    premium: false,
    requiredIntents: ['Guilds', 'GuildMessages'],
    requiredPermissions: ['ViewChannel', 'SendMessages', 'EmbedLinks'],
    commands: ['reminder'],
    events: [],
    configVersion: 1,
    ui: {
      sections: [
        {
          id: 'reminders',
          title: 'Reminders',
          fields: [
            { key: 'enabled', type: 'toggle', label: 'Enable reminders' },
            { key: 'maxActive', type: 'number', label: 'Maximum active reminders per user', min: 1, max: 100 },
            { key: 'maxDuration', type: 'number', label: 'Maximum duration (ms)', min: 60000, max: 31536000000 },
            { key: 'dmOnFire', type: 'toggle', label: 'Deliver reminders by DM' },
            { key: 'color', type: 'color', label: 'Embed color' },
          ],
        },
      ],
    },
  },
  config: reminderConfigDef,
  commands: [ReminderCommand],
  setup: (ctx) => {
    ctx.scheduler.register('reminder:fire', async (job) => {
      const payload = (job.payload ?? {}) as { reminderId?: string };
      if (!payload.reminderId || !job.guildId) return;
      const reminder = await ctx.client.prisma.reminder.findUnique({ where: { id: payload.reminderId } });
      if (!reminder) return;
      const config = await loadReminderConfig(ctx.client.configStore, job.guildId);
      const user = await ctx.client.users.fetch(reminder.userId).catch(() => null);
      const content = `Reminder: ${reminder.message}`;
      let delivered = false;
      if (config.dmOnFire && user) {
        delivered = Boolean(await user.send(content).catch(() => null));
      }
      if (!delivered) {
        const guild = ctx.client.guilds.cache.get(reminder.guildId);
        const channel = guild?.channels.cache.get(reminder.channelId);
        if (channel?.isTextBased()) {
          delivered = Boolean(
            await channel
              .send({ content: `<@${reminder.userId}> ${content}`, allowedMentions: { users: [reminder.userId] } })
              .catch(() => null),
          );
        }
      }
      if (!delivered && user) await user.send(content).catch(() => undefined);
      await ctx.client.prisma.reminder.delete({ where: { id: reminder.id } }).catch((error) =>
        logger.warn(`Could not delete fired reminder ${reminder.id}`, error),
      );
    });
  },
};

export default reminders;
