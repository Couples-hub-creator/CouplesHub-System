import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  type GuildMember,
  type Interaction,
  type TextChannel,
} from 'discord.js';
import type { BotClient } from '../../structures/BotClient';
import { logger } from '../../core/logger';
import type { TicketConfig } from './config';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);
}

export function isStaff(member: GuildMember, config: TicketConfig): boolean {
  return member.permissions.has(PermissionFlagsBits.ManageChannels) || config.staffRoles.some((id) => member.roles.cache.has(id));
}

export async function buildTranscript(client: BotClient, channel: TextChannel): Promise<Buffer | null> {
  const messages = await channel.messages.fetch({ limit: 500 }).catch(() => null);
  if (!messages) return null;
  const rows = Array.from(messages.values())
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
    .map((message) => {
      const attachments = Array.from(message.attachments.values())
        .map((attachment) => `<a href="${escapeHtml(attachment.url)}">${escapeHtml(attachment.name)}</a>`)
        .join(' ');
      return `<div class="message"><div class="meta"><strong>${escapeHtml(message.author.tag)}</strong> <span>${message.createdAt.toISOString()}</span></div><div class="body">${escapeHtml(message.content).replace(/\n/g, '<br>')}</div>${attachments ? `<div class="attachments">${attachments}</div>` : ''}</div>`;
    })
    .join('\n');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Ticket transcript</title><style>body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;padding:24px}.message{border-bottom:1px solid #334155;padding:12px 0}.meta{font-size:12px;color:#94a3b8}.body{white-space:normal;margin-top:4px}.attachments a{color:#38bdf8}</style></head><body><h1>${escapeHtml(channel.name)}</h1>${rows}</body></html>`;
  return Buffer.from(html, 'utf8');
}

export async function openTicket(client: BotClient, interaction: Interaction, config: TicketConfig): Promise<void> {
  if (!interaction.isButton() || !interaction.guild || !interaction.member) return;
  await interaction.deferReply({ ephemeral: true });
  const member = await interaction.guild.members.fetch(interaction.user.id);
  await client.prisma.guild.upsert({ where: { guildId: interaction.guild.id }, update: {}, create: { guildId: interaction.guild.id } });
  await client.prisma.user.upsert({
    where: { userId_guildId: { userId: member.id, guildId: interaction.guild.id } },
    update: {},
    create: { userId: member.id, guildId: interaction.guild.id },
  });
  const open = await client.prisma.ticket.count({
    where: { guildId: interaction.guild.id, userId: member.id, status: 'open' },
  });
  if (open >= config.maxOpen) {
    await interaction.editReply({ content: `You already have ${open} open ticket${open === 1 ? '' : 's'}. Close one first.` });
    return;
  }

  const category = config.categoryId ? interaction.guild.channels.cache.get(config.categoryId) : null;
  if (config.categoryId && category?.type !== ChannelType.GuildCategory) {
    await interaction.editReply({ content: 'The ticket category is missing or is not a category channel.' });
    return;
  }
  const count = await client.prisma.ticket.count({ where: { guildId: interaction.guild.id } });
  const name = config.naming
    .replaceAll('{username}', member.user.username)
    .replaceAll('{id}', member.id)
    .replaceAll('{count}', String(count + 1))
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 90) || `ticket-${count + 1}`;

  const overwrites = [
    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: member.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles],
    },
    ...config.staffRoles.map((id) => ({
      id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ManageMessages],
    })),
  ];

  const channel = await interaction.guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: category?.id,
    permissionOverwrites: overwrites,
    reason: `Ticket opened by ${member.user.tag}`,
  } as any).catch(async (error) => {
    logger.warn('Could not create ticket channel', error);
    return null;
  });
  if (!channel) {
    await interaction.editReply({ content: 'I could not create the ticket channel. Check my Manage Channels permission.' });
    return;
  }

  await client.prisma.ticket.create({
    data: { guildId: interaction.guild.id, userId: member.id, channelId: channel.id, category: 'support', status: 'open' },
  });

  const embed = new EmbedBuilder()
    .setColor(0x19d68f)
    .setTitle(`Ticket #${count + 1}`)
    .setDescription(
      config.welcomeMessage
        .replaceAll('{user}', `${member}`)
        .replaceAll('{server}', interaction.guild.name)
        .replaceAll('{count}', String(count + 1)),
    )
    .setTimestamp();
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('ticket:close').setLabel('Close').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ticket:claim').setLabel('Claim').setStyle(ButtonStyle.Secondary),
  );
  await (channel as TextChannel).send({
    content: config.pingStaff ? config.staffRoles.map((id) => `<@&${id}>`).join(' ') : undefined,
    embeds: [embed],
    components: [row],
    allowedMentions: { roles: config.pingStaff ? config.staffRoles : [] },
  });
  await interaction.editReply({ content: `Your ticket is open: ${channel}` });
}

export async function closeTicket(client: BotClient, interaction: Interaction, config: TicketConfig): Promise<void> {
  if (!interaction.isButton() || !interaction.guild || !interaction.channel?.isTextBased()) return;
  await interaction.deferReply({ ephemeral: true });
  const ticket = await client.prisma.ticket.findFirst({
    where: { guildId: interaction.guild.id, channelId: interaction.channelId, status: 'open' },
  });
  if (!ticket) {
    await interaction.editReply({ content: 'This channel is not an open ticket.' });
    return;
  }
  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (member.id !== ticket.userId && !isStaff(member, config)) {
    await interaction.editReply({ content: 'Only the ticket owner or staff can close this ticket.' });
    return;
  }
  if (!config.allowUserClose && member.id === ticket.userId && !isStaff(member, config)) {
    await interaction.editReply({ content: 'Only staff can close tickets in this server.' });
    return;
  }

  if (config.transcriptChannel) {
    const transcriptChannel = interaction.guild.channels.cache.get(config.transcriptChannel);
    if (transcriptChannel?.isTextBased()) {
      const transcript = await buildTranscript(client, interaction.channel as TextChannel);
      if (transcript) {
        await (transcriptChannel as TextChannel).send({
          content: `Transcript for ticket <#${ticket.channelId}> opened by <@${ticket.userId}>`,
          files: [new AttachmentBuilder(transcript, { name: `ticket-${ticket.channelId}.html` })],
          allowedMentions: { parse: [] },
        }).catch((error) => logger.warn('Could not send ticket transcript', error));
      }
    }
  }

  await client.prisma.ticket.update({ where: { id: ticket.id }, data: { status: 'closed', closedAt: new Date() } });
  const ticketChannel = interaction.channel as TextChannel;
  await ticketChannel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0xef4444)
        .setDescription(config.closeMessage.replaceAll('{closer}', `${member}`).replaceAll('{user}', `<@${ticket.userId}>`)),
    ],
  }).catch(() => undefined);
  await interaction.editReply({ content: 'Ticket closed.' });
  setTimeout(() => {
    void interaction.channel?.delete('Ticket closed').catch(() => undefined);
  }, 5_000).unref?.();
}

export async function claimTicket(client: BotClient, interaction: Interaction, config: TicketConfig): Promise<void> {
  if (!interaction.isButton() || !interaction.guild) return;
  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!isStaff(member, config)) {
    await interaction.reply({ content: 'Only staff can claim tickets.', ephemeral: true });
    return;
  }
  const ticket = await client.prisma.ticket.findFirst({
    where: { guildId: interaction.guild.id, channelId: interaction.channelId, status: 'open' },
  });
  if (!ticket) {
    await interaction.reply({ content: 'This channel is not an open ticket.', ephemeral: true });
    return;
  }
  await client.prisma.ticket.update({ where: { id: ticket.id }, data: { claimedBy: member.id } });
  await interaction.reply({ content: `Ticket claimed by ${member}.` });
}
