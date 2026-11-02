import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Role,
  type TextChannel,
} from 'discord.js';
import { Command } from '../../structures/Command';
import { loadTicketConfig, saveTicketConfig, type TicketConfig } from './config';
import { buildTranscript, isStaff } from './service';

export class TicketCommand extends Command {
  public category = 'tickets' as const;
  public cooldown = 3;
  public permissions = {
    bot: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles],
  };

  public data = new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Configure and manage support tickets')
    .addSubcommand((sub) =>
      sub.setName('setup').setDescription('Set up the ticket system')
        .addChannelOption((option) => option.setName('category').setDescription('Category for ticket channels').addChannelTypes(ChannelType.GuildCategory))
        .addChannelOption((option) => option.setName('panel').setDescription('Panel channel').addChannelTypes(ChannelType.GuildText))
        .addChannelOption((option) => option.setName('transcript').setDescription('Transcript channel').addChannelTypes(ChannelType.GuildText)),
    )
    .addSubcommand((sub) => sub.setName('panel').setDescription('Post the ticket panel'))
    .addSubcommand((sub) => sub.setName('close').setDescription('Close the current ticket'))
    .addSubcommand((sub) => sub.setName('claim').setDescription('Claim the current ticket'))
    .addSubcommand((sub) =>
      sub.setName('staff').setDescription('Manage ticket staff roles')
        .addStringOption((option) => option.setName('action').setDescription('Add, remove or list').setRequired(true).addChoices({ name: 'Add', value: 'add' }, { name: 'Remove', value: 'remove' }, { name: 'List', value: 'list' }))
        .addRoleOption((option) => option.setName('role').setDescription('Role')),
    )
    .addSubcommand((sub) =>
      sub.setName('add').setDescription('Add a member to the current ticket')
        .addUserOption((option) => option.setName('user').setDescription('Member').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub.setName('remove').setDescription('Remove a member from the current ticket')
        .addUserOption((option) => option.setName('user').setDescription('Member').setRequired(true)),
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('List open tickets')) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.guildId || !interaction.guild) return;
    const client = interaction.client as any;
    let config: TicketConfig = await loadTicketConfig(client.prisma, client.configStore, interaction.guildId);
    const sub = interaction.options.getSubcommand();
    if (['setup', 'panel', 'staff', 'list'].includes(sub) && !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.editReply({ content: 'You need Manage Server for that ticket action.' });
      return;
    }
    const save = async (next: TicketConfig) => {
      config = await saveTicketConfig(client.prisma, client.configStore, interaction.guildId!, next, {
        id: interaction.user.id,
        name: interaction.user.tag,
      });
    };

    if (sub === 'setup') {
      const category = interaction.options.getChannel('category');
      const panel = interaction.options.getChannel('panel');
      const transcript = interaction.options.getChannel('transcript');
      await save({
        ...config,
        categoryId: category?.id ?? config.categoryId,
        panelChannel: panel?.id ?? config.panelChannel,
        transcriptChannel: transcript?.id ?? config.transcriptChannel,
      });
      await interaction.editReply({ content: 'Ticket setup saved. Use `/ticket panel` to post the panel.' });
      return;
    }

    if (sub === 'panel') {
      const channel = (config.panelChannel ? interaction.guild.channels.cache.get(config.panelChannel) : interaction.channel) as TextChannel | null;
      if (!channel?.isTextBased()) {
        await interaction.editReply({ content: 'Set a panel channel first.' });
        return;
      }
      const embed = new EmbedBuilder()
        .setColor(0x19d68f)
        .setTitle('Support tickets')
        .setDescription('Click the button below and a private channel will be created for you.');
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('ticket:open').setLabel(config.buttonLabel).setStyle(ButtonStyle.Primary),
      );
      await channel.send({ embeds: [embed], components: [row] });
      await interaction.editReply({ content: `Panel sent to ${channel}.` });
      return;
    }

    if (sub === 'staff') {
      const action = interaction.options.getString('action', true);
      const role = interaction.options.getRole('role') as Role | null;
      if (action === 'list') {
        await interaction.editReply({ content: config.staffRoles.length ? config.staffRoles.map((id) => `<@&${id}>`).join(', ') : 'No staff roles configured.' });
        return;
      }
      if (!role) {
        await interaction.editReply({ content: 'Choose a role.' });
        return;
      }
      await save({
        ...config,
        staffRoles:
          action === 'add'
            ? Array.from(new Set([...config.staffRoles, role.id]))
            : config.staffRoles.filter((id) => id !== role.id),
      });
      await interaction.editReply({ content: `Ticket staff roles updated.` });
      return;
    }

    if (sub === 'list') {
      const tickets = await client.prisma.ticket.findMany({ where: { guildId: interaction.guildId, status: 'open' }, orderBy: { createdAt: 'desc' } });
      await interaction.editReply({
        content: tickets.length
          ? tickets.map((ticket: any) => `<#${ticket.channelId}> — <@${ticket.userId}>${ticket.claimedBy ? ` — claimed by <@${ticket.claimedBy}>` : ''}`).join('\n')
          : 'No open tickets.',
      });
      return;
    }

    const channel = interaction.channel;
    if (!channel?.isTextBased()) {
      await interaction.editReply({ content: 'Use this in a ticket channel.' });
      return;
    }
    const ticket = await client.prisma.ticket.findFirst({
      where: { guildId: interaction.guildId, channelId: channel.id, status: 'open' },
    });
    if (!ticket) {
      await interaction.editReply({ content: 'This channel is not an open ticket.' });
      return;
    }
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const staff = isStaff(member, config);

    if (sub === 'claim') {
      if (!staff) {
        await interaction.editReply({ content: 'Only staff can claim tickets.' });
        return;
      }
      await client.prisma.ticket.update({ where: { id: ticket.id }, data: { claimedBy: member.id } });
      await interaction.editReply({ content: 'Ticket claimed.' });
      return;
    }

    if (sub === 'add' || sub === 'remove') {
      if (!staff) {
        await interaction.editReply({ content: 'Only staff can change ticket access.' });
        return;
      }
      const user = interaction.options.getUser('user', true);
      await (channel as TextChannel).permissionOverwrites.edit(user.id, sub === 'add' ? {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      } : {
        ViewChannel: false,
      }).catch(() => undefined);
      await interaction.editReply({ content: sub === 'add' ? `Added ${user} to the ticket.` : `Removed ${user} from the ticket.` });
      return;
    }

    if (sub === 'close') {
      if (member.id !== ticket.userId && !staff) {
        await interaction.editReply({ content: 'Only the ticket owner or staff can close this ticket.' });
        return;
      }
      if (!config.allowUserClose && member.id === ticket.userId && !staff) {
        await interaction.editReply({ content: 'Only staff can close tickets in this server.' });
        return;
      }
      if (config.transcriptChannel) {
        const transcriptChannel = interaction.guild.channels.cache.get(config.transcriptChannel);
        if (transcriptChannel?.isTextBased()) {
          const buffer = await buildTranscript(client, channel as TextChannel);
          if (buffer) {
            const { AttachmentBuilder } = await import('discord.js');
            await (transcriptChannel as TextChannel).send({
              content: `Transcript for <#${ticket.channelId}> opened by <@${ticket.userId}>`,
              files: [new AttachmentBuilder(buffer, { name: `ticket-${ticket.channelId}.html` })],
              allowedMentions: { parse: [] },
            }).catch(() => undefined);
          }
        }
      }
      await client.prisma.ticket.update({ where: { id: ticket.id }, data: { status: 'closed', closedAt: new Date() } });
      await interaction.editReply({ content: 'Ticket closed. This channel will be removed in 5 seconds.' });
      setTimeout(() => void (channel as TextChannel).delete('Ticket closed').catch(() => undefined), 5_000).unref?.();
    }
  }
}
