import type { BotModule } from '../../core/modules/types';
import { economyConfigDef } from './config';
import { BalanceCommand, DailyCommand, EconomyCommand, PayCommand, RobCommand, WorkCommand } from './commands';

const economy: BotModule = {
  manifest: {
    id: 'economy',
    name: 'Economy',
    icon: 'coins',
    category: 'Engagement',
    description: 'Balances, daily rewards, work, payments, robbery and economy administration.',
    premium: false,
    requiredIntents: ['Guilds', 'GuildMembers'],
    requiredPermissions: ['ViewChannel', 'SendMessages', 'EmbedLinks'],
    commands: ['balance', 'daily', 'work', 'pay', 'rob', 'economy'],
    events: [],
    configVersion: 1,
    ui: {
      sections: [
        {
          id: 'rewards',
          title: 'Rewards',
          fields: [
            { key: 'enabled', type: 'toggle', label: 'Enable the economy' },
            { key: 'currency', type: 'text', label: 'Currency name' },
            { key: 'startingBalance', type: 'number', label: 'Starting balance', min: 0, max: 1000000 },
            { key: 'dailyAmount', type: 'number', label: 'Daily reward', min: 0, max: 1000000 },
            { key: 'workMin', type: 'number', label: 'Minimum work reward', min: 0, max: 1000000 },
            { key: 'workMax', type: 'number', label: 'Maximum work reward', min: 0, max: 1000000 },
          ],
        },
        {
          id: 'rules',
          title: 'Cooldowns and crime',
          fields: [
            { key: 'dailyCooldown', type: 'number', label: 'Daily cooldown (ms)', min: 60000, max: 604800000 },
            { key: 'workCooldown', type: 'number', label: 'Work cooldown (ms)', min: 30000, max: 86400000 },
            { key: 'robEnabled', type: 'toggle', label: 'Enable robbery' },
            { key: 'robChance', type: 'slider', label: 'Rob success chance', min: 0.05, max: 0.95, step: 0.05 },
            { key: 'robMax', type: 'number', label: 'Maximum robbery', min: 1, max: 1000000 },
            { key: 'robCooldown', type: 'number', label: 'Rob cooldown (ms)', min: 60000, max: 86400000 },
            { key: 'taxRate', type: 'slider', label: 'Transfer tax', min: 0, max: 0.5, step: 0.01 },
          ],
        },
      ],
    },
  },
  config: economyConfigDef,
  commands: [BalanceCommand, DailyCommand, WorkCommand, PayCommand, RobCommand, EconomyCommand],
  actions: {
    give: async (ctx) => {
      const userId = String(ctx.payload.userId ?? '');
      const amount = Number(ctx.payload.amount ?? 0);
      if (!/^\d{5,25}$/.test(userId) || !Number.isFinite(amount) || amount <= 0) throw new Error('userId and a positive amount are required');
      await ctx.client.prisma.guild.upsert({ where: { guildId: ctx.guildId }, update: {}, create: { guildId: ctx.guildId } });
      await ctx.client.prisma.user.upsert({
        where: { userId_guildId: { userId, guildId: ctx.guildId } },
        update: { balance: { increment: Math.floor(amount) } },
        create: { userId, guildId: ctx.guildId, balance: Math.floor(amount) },
      });
      return { ok: true };
    },
  },
};

export default economy;
