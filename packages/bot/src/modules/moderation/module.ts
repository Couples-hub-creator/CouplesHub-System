import type { BotModule } from '../../core/modules/types';
import { moderationConfigDef } from './config';
import { CaseCommand } from './case';
import { ModerationCommand } from './command';

const moderation: BotModule = {
  manifest: {
    id: 'moderation',
    name: 'Moderation',
    icon: 'shield',
    category: 'Moderation',
    description: 'Warnings, timeouts, kicks, bans, case history, undo and bulk cleanup with full audit trails.',
    premium: false,
    requiredIntents: ['Guilds', 'GuildMembers', 'GuildModeration'],
    requiredPermissions: [
      'ViewChannel',
      'SendMessages',
      'EmbedLinks',
      'ManageMessages',
      'ManageChannels',
      'ModerateMembers',
      'KickMembers',
      'BanMembers',
    ],
    commands: [
      'ban',
      'kick',
      'lock',
      'purge',
      'slowmode',
      'timeout',
      'unban',
      'unlock',
      'warn',
      'warnings',
      'case',
      'moderation',
    ],
    events: [],
    configVersion: 1,
    ui: {
      sections: [
        {
          id: 'punishments',
          title: 'Punishments',
          fields: [
            { key: 'enabled', type: 'toggle', label: 'Enable moderation' },
            { key: 'maxWarnsBeforeBan', type: 'number', label: 'Warnings before automatic ban', min: 0, max: 100 },
            { key: 'defaultMuteDuration', type: 'number', label: 'Default timeout (ms)', min: 60000, max: 2419200000 },
            { key: 'warnExpiryDays', type: 'number', label: 'Warning expiry (days)', min: 0, max: 3650 },
            { key: 'banDeleteDays', type: 'number', label: 'Ban message deletion (days)', min: 0, max: 7 },
          ],
        },
        {
          id: 'notifications',
          title: 'Notifications',
          fields: [
            { key: 'dmOnPunish', type: 'toggle', label: 'DM punished members' },
            { key: 'dmTemplate', type: 'textarea', label: 'Punishment DM template' },
            { key: 'appealUrl', type: 'text', label: 'Appeal URL', placeholder: 'https://example.com/appeal' },
            { key: 'publicCases', type: 'toggle', label: 'Public case replies' },
            { key: 'requireReason', type: 'toggle', label: 'Require a reason' },
          ],
        },
      ],
    },
  },
  config: moderationConfigDef,
  commands: [CaseCommand, ModerationCommand],
  actions: {
    history: async (ctx) => {
      const userId = typeof ctx.payload.userId === 'string' ? ctx.payload.userId : undefined;
      const cases = await ctx.client.prisma.infraction.findMany({
        where: { guildId: ctx.guildId, deletedAt: null, ...(userId ? { userId } : {}) },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return { cases };
    },
    caseDelete: async (ctx) => {
      const number = Number(ctx.payload.caseNumber);
      if (!Number.isInteger(number)) throw new Error('caseNumber is required');
      const row = await ctx.client.prisma.infraction.findFirst({
        where: { guildId: ctx.guildId, caseNumber: number },
      });
      if (!row) throw new Error('Case not found');
      await ctx.client.prisma.infraction.update({
        where: { id: row.id },
        data: { deletedAt: new Date(), active: false },
      });
      return { ok: true, caseNumber: number };
    },
    clearWarnings: async (ctx) => {
      const userId = String(ctx.payload.userId ?? '');
      if (!/^\d{5,25}$/.test(userId)) throw new Error('userId is required');
      const result = await ctx.client.prisma.infraction.updateMany({
        where: { guildId: ctx.guildId, userId, type: 'warn', active: true },
        data: { active: false },
      });
      return { ok: true, count: result.count };
    },
  },
};

export default moderation;
