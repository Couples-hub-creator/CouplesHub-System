import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type Guild,
  type TextChannel,
} from 'discord.js';
import type { BotClient } from '../../structures/BotClient';
import type { SuggestionConfig } from './config';

interface SuggestionRow {
  id: string;
  userId: string;
  content: string;
  status: string;
  createdAt: Date;
  channelId?: string | null;
  messageId?: string | null;
}

export function suggestionEmbed(suggestion: SuggestionRow, config: SuggestionConfig): EmbedBuilder {
  const color =
    suggestion.status === 'approved'
      ? 0x19d68f
      : suggestion.status === 'denied'
        ? 0xef4444
        : Number.parseInt(config.color.replace('#', ''), 16);
  return new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: suggestion.status === 'pending' ? 'New suggestion' : `Suggestion ${suggestion.status}` })
    .setDescription(suggestion.content.slice(0, 3900))
    .setFooter({ text: config.anonymous ? `Anonymous suggestion • ${suggestion.id}` : `Suggested by ${suggestion.userId} • ${suggestion.id}` })
    .setTimestamp(suggestion.createdAt);
}

export function suggestionButtons(suggestion: SuggestionRow): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`suggestion:approve:${suggestion.id}`)
      .setLabel('Approve')
      .setStyle(ButtonStyle.Success)
      .setDisabled(suggestion.status !== 'pending'),
    new ButtonBuilder()
      .setCustomId(`suggestion:deny:${suggestion.id}`)
      .setLabel('Deny')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(suggestion.status !== 'pending'),
  );
}

export async function reviewSuggestion(
  client: BotClient,
  guild: Guild,
  suggestionId: string,
  status: 'approved' | 'denied',
  reviewerId: string,
  config: SuggestionConfig,
  note?: string,
): Promise<boolean> {
  const suggestion = await client.prisma.suggestion.findFirst({ where: { id: suggestionId, guildId: guild.id } });
  if (!suggestion || suggestion.status !== 'pending') return false;
  const updated = await client.prisma.suggestion.update({
    where: { id: suggestion.id },
    data: { status, reviewedBy: reviewerId, reviewNote: note ?? null },
  });
  const channel = suggestion.channelId ? guild.channels.cache.get(suggestion.channelId) : null;
  if (channel?.isTextBased() && suggestion.messageId) {
    const message = await (channel as TextChannel).messages.fetch(suggestion.messageId).catch(() => null);
    if (message) {
      await message
        .edit({ embeds: [suggestionEmbed(updated, config)], components: [suggestionButtons(updated)] })
        .catch(() => undefined);
    }
  }
  const logChannel = config.logChannel ? guild.channels.cache.get(config.logChannel) : channel;
  if (logChannel?.isTextBased()) {
    await (logChannel as TextChannel)
      .send({
        embeds: [
          new EmbedBuilder()
            .setColor(status === 'approved' ? 0x19d68f : 0xef4444)
            .setDescription(
              `Suggestion \`${suggestion.id}\` was **${status}** by <@${reviewerId}>.${note ? `\n${note}` : ''}`,
            ),
        ],
        allowedMentions: { parse: [] },
      })
      .catch(() => undefined);
  }
  return true;
}
