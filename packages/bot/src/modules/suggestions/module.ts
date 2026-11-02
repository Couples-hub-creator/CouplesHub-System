import { PermissionFlagsBits } from 'discord.js';
import type { BotModule } from '../../core/modules/types';
import { SuggestCommand, SuggestionsCommand } from './command';
import { loadSuggestionConfig, suggestionConfigDef } from './config';
import { reviewSuggestion } from './service';

const suggestions: BotModule = {
  manifest: {
    id: 'suggestions',
    name: 'Suggestions',
    icon: 'lightbulb',
    category: 'Community',
    description: 'Suggestion inbox with reaction voting, staff approve/deny actions, review notes and audit output.',
    premium: false,
    requiredIntents: ['Guilds', 'GuildMessages', 'GuildMessageReactions'],
    requiredPermissions: ['ViewChannel', 'SendMessages', 'EmbedLinks', 'AddReactions', 'ReadMessageHistory'],
    commands: ['suggest', 'suggestions'],
    events: [],
    configVersion: 1,
    ui: {
      sections: [
        {
          id: 'suggestions',
          title: 'Suggestions',
          fields: [
            { key: 'enabled', type: 'toggle', label: 'Enable suggestions' },
            { key: 'channelId', type: 'channel', label: 'Suggestion channel' },
            { key: 'logChannel', type: 'channel', label: 'Review log channel' },
            { key: 'anonymous', type: 'toggle', label: 'Make suggestions anonymous by default' },
            { key: 'upvote', type: 'text', label: 'Upvote reaction' },
            { key: 'downvote', type: 'text', label: 'Downvote reaction' },
            { key: 'cooldownMs', type: 'number', label: 'Submit cooldown (ms)', min: 0, max: 86400000 },
            { key: 'color', type: 'color', label: 'Embed color' },
          ],
        },
      ],
    },
  },
  config: suggestionConfigDef,
  commands: [SuggestCommand, SuggestionsCommand],
  interactions: {
    suggestion: async (interaction, client) => {
      if (!interaction.isButton() || !interaction.guild || !interaction.guildId) return false;
      const [, action, id] = interaction.customId.split(':');
      if (action !== 'approve' && action !== 'deny') return false;
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({ content: 'Only staff can review suggestions.', ephemeral: true });
        return true;
      }
      const config = await loadSuggestionConfig(client.configStore, interaction.guildId);
      const ok = await reviewSuggestion(
        client,
        interaction.guild,
        id,
        action === 'approve' ? 'approved' : 'denied',
        interaction.user.id,
        config,
      );
      await interaction.reply({
        content: ok ? `Suggestion ${action === 'approve' ? 'approved' : 'denied'}.` : 'That suggestion is already reviewed.',
        ephemeral: true,
      });
      return true;
    },
  },
  actions: {
    list: async (ctx) => {
      const status = typeof ctx.payload.status === 'string' ? ctx.payload.status : undefined;
      const rows = await ctx.client.prisma.suggestion.findMany({
        where: { guildId: ctx.guildId, ...(status ? { status } : {}) },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return { suggestions: rows };
    },
  },
};

export default suggestions;
