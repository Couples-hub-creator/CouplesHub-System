import {
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type GuildBasedChannel,
} from 'discord.js';
import { Command } from '../../structures/Command';

export class ServerInfoCommand extends Command {
  public category = 'utility' as const;
  public cooldown = 3;
  public permissions = { bot: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks] };

  public data = new SlashCommandBuilder().setName('serverinfo').setDescription('Show server information') as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;
    await interaction.deferReply();
    const guild = await interaction.guild.fetch();
    const owner = await guild.fetchOwner().catch(() => null);
    const channels = guild.channels.cache;
    const embed = new EmbedBuilder()
      .setColor(0x19d68f)
      .setTitle(guild.name)
      .setThumbnail(guild.iconURL({ size: 256 }))
      .addFields(
        { name: 'Owner', value: owner ? `${owner.user.tag}` : guild.ownerId, inline: true },
        { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true },
        { name: 'Members', value: guild.memberCount.toLocaleString('en-US'), inline: true },
        { name: 'Channels', value: `${channels.filter((channel) => channel.type !== ChannelType.GuildCategory).size}`, inline: true },
        { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
        { name: 'Boosts', value: `${guild.premiumSubscriptionCount ?? 0} (level ${guild.premiumTier})`, inline: true },
        { name: 'Verification', value: String(guild.verificationLevel), inline: true },
        { name: 'Locale', value: guild.preferredLocale, inline: true },
        { name: 'ID', value: guild.id, inline: true },
      );
    if (guild.description) embed.setDescription(guild.description);
    await interaction.editReply({ embeds: [embed] });
  }
}

export class UserInfoCommand extends Command {
  public category = 'utility' as const;
  public cooldown = 3;
  public permissions = { bot: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks] };

  public data = new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Show information about a member')
    .addUserOption((option) => option.setName('user').setDescription('Member; defaults to you')) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;
    await interaction.deferReply();
    const target = interaction.options.getUser('user') ?? interaction.user;
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    const embed = new EmbedBuilder()
      .setColor(member?.displayColor || 0x19d68f)
      .setTitle(member?.displayName ?? target.username)
      .setThumbnail(target.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'Username', value: target.tag, inline: true },
        { name: 'ID', value: target.id, inline: true },
        { name: 'Account created', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:F>`, inline: true },
      );
    if (member) {
      embed.addFields(
        { name: 'Joined', value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` : 'Unknown', inline: true },
        { name: 'Top role', value: `${member.roles.highest}`, inline: true },
        { name: 'Roles', value: member.roles.cache.filter((role) => role.id !== interaction.guild!.id).map((role) => `${role}`).slice(0, 20).join(', ') || 'None' },
      );
      if (member.premiumSinceTimestamp) {
        embed.addFields({ name: 'Boosting since', value: `<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>`, inline: true });
      }
    }
    await interaction.editReply({ embeds: [embed] });
  }
}

export class AvatarCommand extends Command {
  public category = 'utility' as const;
  public cooldown = 2;
  public permissions = { bot: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks] };

  public data = new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Show a member avatar')
    .addUserOption((option) => option.setName('user').setDescription('Member; defaults to you'))
    .addIntegerOption((option) =>
      option
        .setName('size')
        .setDescription('Image size')
        .addChoices(
          { name: '256', value: 256 },
          { name: '512', value: 512 },
          { name: '1024', value: 1024 },
          { name: '2048', value: 2048 },
        ),
    ) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();
    const target = interaction.options.getUser('user') ?? interaction.user;
    const size = (interaction.options.getInteger('size') ?? 512) as 256 | 512 | 1024 | 2048;
    const member = interaction.guild ? await interaction.guild.members.fetch(target.id).catch(() => null) : null;
    const url = member?.displayAvatarURL({ size, extension: 'png' }) ?? target.displayAvatarURL({ size, extension: 'png' });
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x19d68f)
          .setTitle(`Avatar for ${target.username}`)
          .setImage(url),
      ],
    });
  }
}

export class BannerCommand extends Command {
  public category = 'utility' as const;
  public cooldown = 2;
  public permissions = { bot: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks] };

  public data = new SlashCommandBuilder()
    .setName('banner')
    .setDescription('Show a member profile banner')
    .addUserOption((option) => option.setName('user').setDescription('Member; defaults to you')) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();
    const target = await interaction.client.users.fetch((interaction.options.getUser('user') ?? interaction.user).id, { force: true });
    const banner = target.bannerURL({ size: 1024 });
    if (!banner) {
      await interaction.editReply({ content: 'That member does not have a profile banner.' });
      return;
    }
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0x19d68f).setTitle(`Banner for ${target.username}`).setImage(banner)],
    });
  }
}

export class RoleInfoCommand extends Command {
  public category = 'utility' as const;
  public cooldown = 3;
  public permissions = { bot: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks] };

  public data = new SlashCommandBuilder()
    .setName('roleinfo')
    .setDescription('Show information about a role')
    .addRoleOption((option) => option.setName('role').setDescription('Role').setRequired(true)) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;
    await interaction.deferReply();
    const role = await interaction.guild.roles.fetch(interaction.options.getRole('role', true).id);
    if (!role) {
      await interaction.editReply({ content: 'Role not found.' });
      return;
    }
    const members = role.id === interaction.guild.id ? interaction.guild.memberCount : await interaction.guild.members.fetch().then((all) => all.filter((member) => member.roles.cache.has(role.id)).size).catch(() => 0);
    const embed = new EmbedBuilder()
      .setColor(role.color || 0x19d68f)
      .setTitle(`Role: ${role.name}`)
      .addFields(
        { name: 'ID', value: role.id, inline: true },
        { name: 'Members', value: String(members), inline: true },
        { name: 'Position', value: String(role.position), inline: true },
        { name: 'Color', value: role.hexColor, inline: true },
        { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
        { name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
        { name: 'Managed', value: role.managed ? 'Yes' : 'No', inline: true },
        { name: 'Created', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:F>` },
        { name: 'Permissions', value: role.permissions.toArray().slice(0, 30).join(', ').toLowerCase() || 'None' },
      );
    await interaction.editReply({ embeds: [embed] });
  }
}

export class ChannelInfoCommand extends Command {
  public category = 'utility' as const;
  public cooldown = 3;
  public permissions = { bot: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks] };

  public data = new SlashCommandBuilder()
    .setName('channelinfo')
    .setDescription('Show information about a channel')
    .addChannelOption((option) => option.setName('channel').setDescription('Channel; defaults to this one')) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;
    await interaction.deferReply();
    const channel = (interaction.options.getChannel('channel') ?? interaction.channel) as GuildBasedChannel | null;
    if (!channel) {
      await interaction.editReply({ content: 'Channel not found.' });
      return;
    }
    const embed = new EmbedBuilder()
      .setColor(0x19d68f)
      .setTitle(`Channel: ${channel.name}`)
      .addFields(
        { name: 'ID', value: channel.id, inline: true },
        { name: 'Type', value: String(channel.type), inline: true },
        { name: 'Created', value: channel.createdTimestamp ? `<t:${Math.floor(channel.createdTimestamp / 1000)}:F>` : 'Unknown', inline: true },
      );
    if ('parent' in channel && channel.parent) embed.addFields({ name: 'Category', value: channel.parent.name, inline: true });
    if ('topic' in channel && channel.topic) embed.addFields({ name: 'Topic', value: channel.topic.slice(0, 1024) });
    if ('nsfw' in channel) embed.addFields({ name: 'NSFW', value: channel.nsfw ? 'Yes' : 'No', inline: true });
    if ('rateLimitPerUser' in channel) embed.addFields({ name: 'Slowmode', value: `${channel.rateLimitPerUser ?? 0}s`, inline: true });
    if ('userLimit' in channel) embed.addFields({ name: 'User limit', value: String(channel.userLimit), inline: true });
    await interaction.editReply({ embeds: [embed] });
  }
}

export class PingCommand extends Command {
  public category = 'utility' as const;
  public cooldown = 2;
  public permissions = { bot: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] };

  public data = new SlashCommandBuilder().setName('ping').setDescription('Show bot latency') as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sent = await interaction.reply({ content: 'Measuring…', fetchReply: true });
    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x19d68f)
          .addFields(
            { name: 'Gateway', value: `${Math.round(interaction.client.ws.ping)} ms`, inline: true },
            { name: 'Round trip', value: `${roundtrip} ms`, inline: true },
            { name: 'Uptime', value: `<t:${Math.floor((Date.now() - interaction.client.uptime!) / 1000)}:R>`, inline: true },
          ),
      ],
    });
  }
}
