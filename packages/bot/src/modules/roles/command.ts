import {
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Role,
  type TextChannel,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { BotClient } from '../../structures/BotClient';
import { loadRolesConfig } from './config';
import { canManageRole, refreshRoleMenu } from './service';

export class RoleMenuCommand extends Command {
  public category = 'roles' as const;
  public cooldown = 3;
  public permissions = {
    user: [PermissionFlagsBits.ManageRoles],
    bot: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ManageRoles],
  };

  public data = new SlashCommandBuilder()
    .setName('rolemenu')
    .setDescription('Create and manage button role menus')
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Create a button role menu')
        .addStringOption((option) => option.setName('title').setDescription('Embed title').setRequired(true).setMaxLength(200))
        .addStringOption((option) => option.setName('description').setDescription('Embed description').setRequired(true).setMaxLength(2000))
        .addRoleOption((option) => option.setName('role1').setDescription('First role').setRequired(true))
        .addRoleOption((option) => option.setName('role2').setDescription('Second role'))
        .addRoleOption((option) => option.setName('role3').setDescription('Third role'))
        .addRoleOption((option) => option.setName('role4').setDescription('Fourth role'))
        .addRoleOption((option) => option.setName('role5').setDescription('Fifth role'))
        .addChannelOption((option) => option.setName('channel').setDescription('Channel; defaults to here')),
    )
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add a role button to an existing menu')
        .addStringOption((option) => option.setName('message_id').setDescription('Menu message ID').setRequired(true))
        .addRoleOption((option) => option.setName('role').setDescription('Role').setRequired(true))
        .addStringOption((option) => option.setName('label').setDescription('Button label').setMaxLength(80))
        .addStringOption((option) =>
          option
            .setName('style')
            .setDescription('Button style')
            .addChoices(
              { name: 'Secondary', value: 'secondary' },
              { name: 'Primary', value: 'primary' },
              { name: 'Success', value: 'success' },
              { name: 'Danger', value: 'danger' },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a role button')
        .addStringOption((option) => option.setName('message_id').setDescription('Menu message ID').setRequired(true))
        .addRoleOption((option) => option.setName('role').setDescription('Role').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('List role menus'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('delete')
        .setDescription('Delete all buttons on a menu')
        .addStringOption((option) => option.setName('message_id').setDescription('Menu message ID').setRequired(true)),
    ) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.guildId || !interaction.guild || !interaction.member) return;
    const client = interaction.client as BotClient;
    const config = await loadRolesConfig(client.configStore, interaction.guildId);
    const sub = interaction.options.getSubcommand();
    const member = await interaction.guild.members.fetch(interaction.user.id);

    if (sub === 'create') {
      if (!config.enabled) {
        await interaction.editReply({ content: 'Role menus are disabled in this server.' });
        return;
      }
      const channel = (interaction.options.getChannel('channel') ?? interaction.channel) as TextChannel | null;
      if (!channel?.isTextBased()) {
        await interaction.editReply({ content: 'Choose a text channel.' });
        return;
      }
      const roles = [1, 2, 3, 4, 5]
        .map((index) => interaction.options.getRole(`role${index}`) as Role | null)
        .filter((role): role is Role => Boolean(role));
      if (roles.length > config.maxButtons) {
        await interaction.editReply({ content: `This server allows at most ${config.maxButtons} buttons.` });
        return;
      }
      for (const role of roles) {
        if (!canManageRole(member, role)) {
          await interaction.editReply({ content: `I cannot manage ${role}. Move my role above it or remove its integration.` });
          return;
        }
      }
      const embed = new EmbedBuilder()
        .setColor(0x19d68f)
        .setTitle(interaction.options.getString('title', true))
        .setDescription(interaction.options.getString('description', true));
      const message = await channel.send({ embeds: [embed] });
      for (const role of roles) {
        await client.prisma.buttonRole.create({
          data: {
            guildId: interaction.guildId,
            messageId: message.id,
            channelId: channel.id,
            label: role.name,
            style: 'secondary',
            roleId: role.id,
          },
        });
      }
      await refreshRoleMenu(client, message.id);
      await interaction.editReply({ content: `Role menu created: ${message.url}` });
      return;
    }

    const messageId = interaction.options.getString('message_id', true);
    if (!/^\d{5,25}$/.test(messageId)) {
      await interaction.editReply({ content: 'That message ID is invalid.' });
      return;
    }

    if (sub === 'add') {
      const role = interaction.options.getRole('role', true) as Role;
      if (!canManageRole(member, role)) {
        await interaction.editReply({ content: `I cannot manage ${role}.` });
        return;
      }
      const count = await client.prisma.buttonRole.count({ where: { guildId: interaction.guildId, messageId } });
      if (count >= config.maxButtons) {
        await interaction.editReply({ content: `This server allows at most ${config.maxButtons} buttons per menu.` });
        return;
      }
      const existing = await client.prisma.buttonRole.findFirst({ where: { guildId: interaction.guildId, messageId, roleId: role.id } });
      if (existing) {
        await interaction.editReply({ content: 'That role is already on this menu.' });
        return;
      }
      await client.prisma.buttonRole.create({
        data: {
          guildId: interaction.guildId,
          messageId,
          channelId: interaction.channelId,
          label: interaction.options.getString('label') ?? role.name,
          style: interaction.options.getString('style') ?? 'secondary',
          roleId: role.id,
        },
      });
      await refreshRoleMenu(client, messageId);
      await interaction.editReply({ content: 'Role button added.' });
      return;
    }

    if (sub === 'remove') {
      const role = interaction.options.getRole('role', true);
      const result = await client.prisma.buttonRole.deleteMany({ where: { guildId: interaction.guildId, messageId, roleId: role.id } });
      await refreshRoleMenu(client, messageId);
      await interaction.editReply({ content: result.count ? 'Role button removed.' : 'That role was not on the menu.' });
      return;
    }

    if (sub === 'delete') {
      const result = await client.prisma.buttonRole.deleteMany({ where: { guildId: interaction.guildId, messageId } });
      const channel = interaction.channel as TextChannel;
      const message = await channel.messages.fetch(messageId).catch(() => null);
      if (message) await message.edit({ components: [] }).catch(() => undefined);
      await interaction.editReply({ content: `Deleted ${result.count} button${result.count === 1 ? '' : 's'}.` });
      return;
    }

    const rows = await client.prisma.buttonRole.findMany({
      where: { guildId: interaction.guildId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const grouped = new Map<string, typeof rows>();
    for (const row of rows) {
      const list = grouped.get(row.messageId) ?? [];
      list.push(row);
      grouped.set(row.messageId, list);
    }
    await interaction.editReply({
      content: grouped.size
        ? Array.from(grouped.entries())
            .map(
              ([id, list]) =>
                `**${id}** — ${list.length} button${list.length === 1 ? '' : 's'}: ${list.map((row) => `<@&${row.roleId}>`).join(', ')}`,
            )
            .join('\n')
        : 'No role menus configured.',
    });
  }
}

export class ReactionRoleCommand extends Command {
  public category = 'roles' as const;
  public cooldown = 3;
  public permissions = {
    user: [PermissionFlagsBits.ManageRoles],
    bot: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.AddReactions, PermissionFlagsBits.ReadMessageHistory],
  };

  public data = new SlashCommandBuilder()
    .setName('reactionrole')
    .setDescription('Manage reaction roles')
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add a reaction role to a message')
        .addStringOption((option) => option.setName('message_id').setDescription('Message ID').setRequired(true))
        .addStringOption((option) => option.setName('emoji').setDescription('Emoji').setRequired(true).setMaxLength(64))
        .addRoleOption((option) => option.setName('role').setDescription('Role').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a reaction role')
        .addStringOption((option) => option.setName('message_id').setDescription('Message ID').setRequired(true))
        .addStringOption((option) => option.setName('emoji').setDescription('Emoji').setRequired(true).setMaxLength(64))
        .addRoleOption((option) => option.setName('role').setDescription('Role').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('List reaction roles'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('clear')
        .setDescription('Delete every reaction role on a message')
        .addStringOption((option) => option.setName('message_id').setDescription('Message ID').setRequired(true)),
    ) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.guildId || !interaction.guild || !interaction.channel?.isTextBased()) return;
    const client = interaction.client as BotClient;
    const config = await loadRolesConfig(client.configStore, interaction.guildId);
    if (!config.enabled) {
      await interaction.editReply({ content: 'Role tools are disabled.' });
      return;
    }
    const sub = interaction.options.getSubcommand();
    const messageId = interaction.options.getString('message_id', true);
    const emoji = interaction.options.getString('emoji', true);
    if (sub !== 'list') {
      const message = await (interaction.channel as TextChannel).messages.fetch(messageId).catch(() => null);
      if (!message) {
        await interaction.editReply({ content: 'I cannot find that message in this channel.' });
        return;
      }
      if (sub === 'add') {
        const role = interaction.options.getRole('role', true) as Role;
        const member = await interaction.guild.members.fetch(interaction.user.id);
        if (!canManageRole(member, role)) {
          await interaction.editReply({ content: `I cannot manage ${role}.` });
          return;
        }
        const count = await client.prisma.reactionRole.count({ where: { guildId: interaction.guildId } });
        if (count >= config.maxReactionRoles) {
          await interaction.editReply({ content: `This server allows at most ${config.maxReactionRoles} reaction roles.` });
          return;
        }
        await client.prisma.reactionRole.create({
          data: {
            guildId: interaction.guildId,
            messageId,
            channelId: interaction.channelId,
            emoji,
            roleId: role.id,
          },
        });
        await message.react(emoji).catch(() => undefined);
        await interaction.editReply({ content: 'Reaction role added.' });
        return;
      }
      if (sub === 'remove') {
        const role = interaction.options.getRole('role', true);
        const result = await client.prisma.reactionRole.deleteMany({
          where: { guildId: interaction.guildId, messageId, emoji, roleId: role.id },
        });
        await interaction.editReply({ content: result.count ? 'Reaction role removed.' : 'That reaction role was not found.' });
        return;
      }
      const result = await client.prisma.reactionRole.deleteMany({ where: { guildId: interaction.guildId, messageId } });
      await interaction.editReply({ content: `Deleted ${result.count} reaction role${result.count === 1 ? '' : 's'}.` });
      return;
    }
    const rows = await client.prisma.reactionRole.findMany({ where: { guildId: interaction.guildId }, orderBy: { createdAt: 'desc' }, take: 50 });
    await interaction.editReply({
      content: rows.length
        ? rows.map((row) => `${row.emoji} → <@&${row.roleId}> on \`${row.messageId}\``).join('\n')
        : 'No reaction roles configured.',
    });
  }
}
