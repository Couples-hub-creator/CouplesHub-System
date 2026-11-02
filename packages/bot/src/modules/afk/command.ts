import {
  EmbedBuilder,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { BotClient } from '../../structures/BotClient';
import { loadAfkConfig } from './config';

export class AfkCommand extends Command {
  public category = 'utility' as const;
  public cooldown = 4;

  public data = new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Set an away status')
    .addSubcommand((sub) =>
      sub.setName('set').setDescription('Set your AFK status').addStringOption((option) => option.setName('message').setDescription('Why you are away').setMaxLength(500)),
    )
    .addSubcommand((sub) => sub.setName('clear').setDescription('Clear your AFK status'))
    .addSubcommand((sub) => sub.setName('list').setDescription('List members who are AFK')) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.guildId) return;
    const client = interaction.client as BotClient;
    const config = await loadAfkConfig(client.configStore, interaction.guildId);
    if (!config.enabled) {
      await interaction.editReply({ content: 'AFK status is disabled in this server.' });
      return;
    }
    const sub = interaction.options.getSubcommand();
    if (sub === 'set') {
      const message = (interaction.options.getString('message') ?? 'Away').slice(0, config.maxMessage);
      await client.prisma.guild.upsert({ where: { guildId: interaction.guildId }, update: {}, create: { guildId: interaction.guildId } });
      await client.prisma.afkStatus.upsert({
        where: { guildId_userId: { guildId: interaction.guildId, userId: interaction.user.id } },
        update: { message, createdAt: new Date() },
        create: { guildId: interaction.guildId, userId: interaction.user.id, message },
      });
      await interaction.editReply({ content: `You are now AFK: ${message}` });
      return;
    }
    if (sub === 'clear') {
      const result = await client.prisma.afkStatus.deleteMany({ where: { guildId: interaction.guildId, userId: interaction.user.id } });
      await interaction.editReply({ content: result.count ? 'AFK status cleared.' : 'You were not AFK.' });
      return;
    }
    const rows = await client.prisma.afkStatus.findMany({
      where: { guildId: interaction.guildId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    if (!rows.length) {
      await interaction.editReply({ content: 'Nobody is AFK.' });
      return;
    }
    const embed = new EmbedBuilder()
      .setColor(Number.parseInt(config.color.replace('#', ''), 16))
      .setTitle('AFK members')
      .setDescription(
        rows
          .map((row) => `<@${row.userId}> — ${row.message ?? 'Away'} (<t:${Math.floor(row.createdAt.getTime() / 1000)}:R>)`)
          .join('\n'),
      );
    await interaction.editReply({ embeds: [embed] });
  }
}
