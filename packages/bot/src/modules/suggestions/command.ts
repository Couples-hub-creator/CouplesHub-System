import {
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type TextChannel,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { BotClient } from '../../structures/BotClient';
import { loadSuggestionConfig, suggestionConfigDef, type SuggestionConfig } from './config';
import { reviewSuggestion, suggestionButtons, suggestionEmbed } from './service';

export class SuggestCommand extends Command {
  public category = 'community' as const;
  public cooldown = 8;
  public permissions = {
    bot: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AddReactions],
  };

  public data = new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Submit a suggestion')
    .addStringOption((option) => option.setName('content').setDescription('Your suggestion').setRequired(true).setMaxLength(2000)) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.guildId || !interaction.guild) return;
    const client = interaction.client as BotClient;
    const config = await loadSuggestionConfig(client.configStore, interaction.guildId);
    if (!config.enabled) {
      await interaction.editReply({ content: 'Suggestions are disabled in this server.' });
      return;
    }
    if (await client.cache.get(`suggest:${interaction.guildId}:${interaction.user.id}`)) {
      await interaction.editReply({ content: 'You are sending suggestions too quickly. Try again shortly.' });
      return;
    }
    const channel = config.channelId ? interaction.guild.channels.cache.get(config.channelId) : interaction.channel;
    if (!channel?.isTextBased()) {
      await interaction.editReply({ content: 'The suggestion channel is not configured correctly.' });
      return;
    }
    await client.prisma.guild.upsert({ where: { guildId: interaction.guildId }, update: {}, create: { guildId: interaction.guildId } });
    await client.prisma.user.upsert({
      where: { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId } },
      update: {},
      create: { userId: interaction.user.id, guildId: interaction.guildId },
    });
    const suggestion = await client.prisma.suggestion.create({
      data: {
        guildId: interaction.guildId,
        userId: interaction.user.id,
        channelId: channel.id,
        content: interaction.options.getString('content', true),
        status: 'pending',
      },
    });
    const embed = suggestionEmbed({ ...suggestion }, config);
    const message = await (channel as TextChannel).send({
      embeds: [embed],
      components: [suggestionButtons(suggestion)],
      allowedMentions: { parse: [] },
    });
    await client.prisma.suggestion.update({ where: { id: suggestion.id }, data: { messageId: message.id } });
    if (config.upvote) await message.react(config.upvote).catch(() => undefined);
    if (config.downvote) await message.react(config.downvote).catch(() => undefined);
    if (config.cooldownMs) await client.cache.set(`suggest:${interaction.guildId}:${interaction.user.id}`, true, config.cooldownMs);
    await interaction.editReply({ content: `Suggestion submitted: ${message.url}` });
  }
}

export class SuggestionsCommand extends Command {
  public category = 'community' as const;
  public cooldown = 3;
  public permissions = {
    bot: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
  };

  public data = new SlashCommandBuilder()
    .setName('suggestions')
    .setDescription('Manage suggestions')
    .addSubcommand((sub) =>
      sub
        .setName('channel')
        .setDescription('Set the suggestion channel')
        .addChannelOption((option) => option.setName('channel').setDescription('Channel; omit to clear')),
    )
    .addSubcommand((sub) =>
      sub
        .setName('log')
        .setDescription('Set the suggestion review log channel')
        .addChannelOption((option) => option.setName('channel').setDescription('Channel; omit to clear')),
    )
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription('List recent suggestions')
        .addStringOption((option) =>
          option
            .setName('status')
            .setDescription('Filter')
            .addChoices(
              { name: 'Pending', value: 'pending' },
              { name: 'Approved', value: 'approved' },
              { name: 'Denied', value: 'denied' },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('approve')
        .setDescription('Approve a suggestion')
        .addStringOption((option) => option.setName('id').setDescription('Suggestion ID').setRequired(true))
        .addStringOption((option) => option.setName('note').setDescription('Staff note').setMaxLength(500)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('deny')
        .setDescription('Deny a suggestion')
        .addStringOption((option) => option.setName('id').setDescription('Suggestion ID').setRequired(true))
        .addStringOption((option) => option.setName('note').setDescription('Staff note').setMaxLength(500)),
    ) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.guildId || !interaction.guild) return;
    const client = interaction.client as BotClient;
    const config = await loadSuggestionConfig(client.configStore, interaction.guildId);
    const sub = interaction.options.getSubcommand();
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.editReply({ content: 'You need Manage Server for that action.' });
      return;
    }

    if (sub === 'channel' || sub === 'log') {
      const channel = interaction.options.getChannel('channel');
      const next: SuggestionConfig =
        sub === 'channel'
          ? { ...config, channelId: channel?.id ?? null }
          : { ...config, logChannel: channel?.id ?? null };
      await client.configStore.set(interaction.guildId, suggestionConfigDef, next, {
        id: interaction.user.id,
        name: interaction.user.tag,
      });
      await interaction.editReply({ content: 'Suggestion settings saved.' });
      return;
    }

    if (sub === 'list') {
      const status = interaction.options.getString('status');
      const rows = await client.prisma.suggestion.findMany({
        where: { guildId: interaction.guildId, ...(status ? { status } : {}) },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      await interaction.editReply({
        content: rows.length
          ? rows.map((row) => `\`${row.id}\` — **${row.status}** — ${row.content.slice(0, 120)}`).join('\n')
          : 'No suggestions found.',
      });
      return;
    }

    const id = interaction.options.getString('id', true);
    const note = interaction.options.getString('note') ?? undefined;
    const ok = await reviewSuggestion(
      client,
      interaction.guild,
      id,
      sub === 'approve' ? 'approved' : 'denied',
      interaction.user.id,
      config,
      note,
    );
    await interaction.editReply({ content: ok ? `Suggestion ${sub === 'approve' ? 'approved' : 'denied'}.` : 'That suggestion was not found or is already reviewed.' });
  }
}
