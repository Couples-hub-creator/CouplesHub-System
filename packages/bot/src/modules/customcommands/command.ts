import {
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { BotClient } from '../../structures/BotClient';
import { loadCustomCommandConfig } from './config';

export class CustomCommandCommand extends Command {
  public category = 'extras' as const;
  public cooldown = 3;
  public permissions = {
    user: [PermissionFlagsBits.ManageGuild],
    bot: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
  };

  public data = new SlashCommandBuilder()
    .setName('customcommand')
    .setDescription('Manage prefix custom commands')
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Create or replace a custom command')
        .addStringOption((option) => option.setName('name').setDescription('Command name without prefix').setRequired(true).setMaxLength(32))
        .addStringOption((option) => option.setName('response').setDescription('Response; use {user}, {server}, {channel}, {membercount}').setRequired(true).setMaxLength(2000)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Delete a custom command')
        .addStringOption((option) => option.setName('name').setDescription('Command name').setRequired(true)),
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('List custom commands'))
    .addSubcommand((sub) =>
      sub
        .setName('show')
        .setDescription('Show a custom command response')
        .addStringOption((option) => option.setName('name').setDescription('Command name').setRequired(true)),
    ) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.guildId) return;
    const client = interaction.client as BotClient;
    const config = await loadCustomCommandConfig(client.configStore, interaction.guildId);
    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      if (!config.enabled) {
        await interaction.editReply({ content: 'Custom commands are disabled.' });
        return;
      }
      const name = interaction.options.getString('name', true).toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (name.length < 1) {
        await interaction.editReply({ content: 'Use a name with letters, numbers, underscores or hyphens.' });
        return;
      }
      const count = await client.prisma.customCommand.count({ where: { guildId: interaction.guildId } });
      const existing = await client.prisma.customCommand.findUnique({ where: { guildId_name: { guildId: interaction.guildId, name } } });
      if (!existing && count >= config.maxCommands) {
        await interaction.editReply({ content: `This server allows at most ${config.maxCommands} custom commands.` });
        return;
      }
      await client.prisma.guild.upsert({ where: { guildId: interaction.guildId }, update: {}, create: { guildId: interaction.guildId } });
      await client.prisma.customCommand.upsert({
        where: { guildId_name: { guildId: interaction.guildId, name } },
        update: { response: interaction.options.getString('response', true) },
        create: { guildId: interaction.guildId, name, response: interaction.options.getString('response', true) },
      });
      await interaction.editReply({ content: `Custom command \`${name}\` saved.` });
      return;
    }

    if (sub === 'remove') {
      const name = interaction.options.getString('name', true).toLowerCase();
      const result = await client.prisma.customCommand.deleteMany({ where: { guildId: interaction.guildId, name } });
      await interaction.editReply({ content: result.count ? `Deleted \`${name}\`.` : 'That custom command does not exist.' });
      return;
    }

    if (sub === 'show') {
      const name = interaction.options.getString('name', true).toLowerCase();
      const row = await client.prisma.customCommand.findUnique({ where: { guildId_name: { guildId: interaction.guildId, name } } });
      await interaction.editReply({ content: row ? `**${name}**\n${row.response}` : 'That custom command does not exist.' });
      return;
    }

    const rows = await client.prisma.customCommand.findMany({ where: { guildId: interaction.guildId }, orderBy: { name: 'asc' }, take: 100 });
    if (!rows.length) {
      await interaction.editReply({ content: 'No custom commands configured.' });
      return;
    }
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x19d68f)
          .setTitle('Custom commands')
          .setDescription(rows.map((row) => `\`${row.name}\``).join(', ')),
      ],
    });
  }
}
