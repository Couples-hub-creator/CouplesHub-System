import type { GuildMember } from 'discord.js';
import type { BotModule } from '../../core/modules/types';
import { VerifyCommand } from './command';
import { loadVerifyConfig, verifyConfigDef } from './config';
import { onJoin, startVerification, submitVerification } from './service';
import { logger } from '../../core/logger';

const verification: BotModule = {
  manifest: {
    id: 'verification',
    name: 'Verification',
    icon: 'check-circle',
    category: 'Security',
    description: 'Verification gates with math challenges or one-click buttons, unverified roles and attempt limits.',
    premium: false,
    requiredIntents: ['Guilds', 'GuildMembers'],
    requiredPermissions: ['ViewChannel', 'SendMessages', 'EmbedLinks', 'ManageRoles'],
    commands: ['verify'],
    events: ['guildMemberAdd'],
    configVersion: 1,
    ui: {
      sections: [
        {
          id: 'verification',
          title: 'Verification gate',
          fields: [
            { key: 'enabled', type: 'toggle', label: 'Enable verification' },
            { key: 'verifiedRoleId', type: 'role', label: 'Verified role' },
            { key: 'unverifiedRoleId', type: 'role', label: 'Unverified role' },
            { key: 'panelChannelId', type: 'channel', label: 'Panel channel' },
            { key: 'logChannelId', type: 'channel', label: 'Verification log channel' },
            {
              key: 'method',
              type: 'select',
              label: 'Method',
              options: [
                { label: 'Math challenge', value: 'math' },
                { label: 'One-click button', value: 'button' },
              ],
            },
            { key: 'timeoutMinutes', type: 'number', label: 'Challenge timeout (minutes)', min: 1, max: 1440 },
            { key: 'maxAttempts', type: 'number', label: 'Maximum attempts', min: 1, max: 10 },
            { key: 'kickOnFail', type: 'toggle', label: 'Kick after too many failures' },
            { key: 'panelTitle', type: 'text', label: 'Panel title' },
            { key: 'panelDescription', type: 'textarea', label: 'Panel description' },
            { key: 'buttonLabel', type: 'text', label: 'Button label' },
            { key: 'dmOnVerify', type: 'toggle', label: 'DM after verification' },
          ],
        },
      ],
    },
  },
  config: verifyConfigDef,
  commands: [VerifyCommand],
  interactions: {
    verify: async (interaction, client) => {
      if (!interaction.guildId) return false;
      const config = await loadVerifyConfig(client.configStore, interaction.guildId);
      if (!config.enabled) {
        if ('reply' in interaction && !interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: 'Verification is disabled.', ephemeral: true }).catch(() => undefined);
        }
        return true;
      }
      if (interaction.isButton() && interaction.customId === 'verify:start') {
        await startVerification(client, interaction, config);
        return true;
      }
      if (interaction.isModalSubmit() && interaction.customId === 'verify:answer') {
        await submitVerification(client, interaction, config);
        return true;
      }
      return false;
    },
  },
  events: [
    {
      name: 'guildMemberAdd',
      execute: async (member: GuildMember, client: any) => {
        const config = await loadVerifyConfig(client.configStore, member.guild.id);
        if (!config.enabled) return;
        await onJoin(client, member, config).catch((error: unknown) => logger.warn('Verification join handling failed', error));
      },
    },
  ],
  actions: {
    status: async (ctx) => {
      const config = await loadVerifyConfig(ctx.client.configStore, ctx.guildId);
      return { config };
    },
  },
};

export default verification;
