import {
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type TextChannel,
} from 'discord.js';
import { Command } from '../../structures/Command';
import { t } from '../../core/i18n';
import { localeOf } from '../../core/permissions';
import { loadLoggingConfig, saveLoggingConfig, type LoggingConfig } from './config';

const KINDS = {
  message: 'messageLogs',
  member: 'memberLogs',
  moderation: 'moderationLogs',
  voice: 'voiceLogs',
  role: 'roleLogs',
  channel: 'channelLogs',
} as const;

type Kind = keyof typeof KINDS;

export class LogsCommand extends Command {
  public category = 'logging' as const;
  public cooldown = 4;
  public permissions = {
    user: [PermissionFlagsBits.ManageGuild],
    bot: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
  };

  public data = new SlashCommandBuilder()
    .setName('logs')
    .setDescription('Configure Couples Hub audit logging')
    .addSubcommand((sub) =>
      sub
        .setName('channel')
        .setDescription('Set or clear a log channel')
        .addStringOption((option) =>
          option
            .setName('kind')
            .setDescription('Which event family')
            .setRequired(true)
            .addChoices(
              { name: 'Messages', value: 'message' },
              { name: 'Members', value: 'member' },
              { name: 'Moderation', value: 'moderation' },
              { name: 'Voice', value: 'voice' },
              { name: 'Roles', value: 'role' },
              { name: 'Channels', value: 'channel' },
            ),
        )
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('Channel to send logs to; omit to clear')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('privacy')
        .setDescription('Choose whether message content is stored in logs')
        .addBooleanOption((option) => option.setName('enabled').setDescription('Store message content').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('retention')
        .setDescription('How many days of logs to keep')
        .addIntegerOption((option) =>
          option.setName('days').setDescription('1 to 365').setRequired(true).setMinValue(1).setMaxValue(365),
        ),
    )
    .addSubcommand((sub) => sub.setName('status').setDescription('Show the current logging setup'))
    .addSubcommand((sub) =>
      sub
        .setName('test')
        .setDescription('Send a test entry to the moderation log channel'),
    ) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.guildId) return;
    const client = interaction.client as any;
    let config = await loadLoggingConfig(client.prisma, client.configStore, interaction.guildId);
    const sub = interaction.options.getSubcommand();

    if (sub === 'status') {
      const embed = new EmbedBuilder()
        .setColor(0x19d68f)
        .setTitle(t(localeOf(interaction), 'logging.title'))
        .addFields(
          Object.entries(KINDS).map(([kind, key]) => ({
            name: kind,
            value: config[key] ? `<#${config[key]}>` : t(localeOf(interaction), 'common.notConfigured'),
            inline: true,
          })),
        )
        .addFields(
          { name: 'Message content', value: config.messageContent ? 'On' : 'Off', inline: true },
          { name: 'Retention', value: `${config.retentionDays} days`, inline: true },
        );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (sub === 'channel') {
      const kind = interaction.options.getString('kind', true) as Kind;
      const channel = interaction.options.getChannel('channel') as TextChannel | null;
      config = { ...config, [KINDS[kind]]: channel?.id ?? null } as LoggingConfig;
      await saveLoggingConfig(client.prisma, client.configStore, interaction.guildId, config, {
        id: interaction.user.id,
        name: interaction.user.tag,
      });
      await interaction.editReply({
        content: channel
          ? `Logging **${kind}** events in ${channel}.`
          : `Cleared the **${kind}** log channel.`,
      });
      return;
    }

    if (sub === 'privacy') {
      config = { ...config, messageContent: interaction.options.getBoolean('enabled', true) };
      await saveLoggingConfig(client.prisma, client.configStore, interaction.guildId, config, {
        id: interaction.user.id,
        name: interaction.user.tag,
      });
      await interaction.editReply({ content: `Message content logging is now ${config.messageContent ? 'on' : 'off'}.` });
      return;
    }

    if (sub === 'retention') {
      config = { ...config, retentionDays: interaction.options.getInteger('days', true) };
      await saveLoggingConfig(client.prisma, client.configStore, interaction.guildId, config, {
        id: interaction.user.id,
        name: interaction.user.tag,
      });
      await interaction.editReply({ content: `Log retention is now ${config.retentionDays} days.` });
      return;
    }

    if (sub === 'test') {
      const channelId = config.moderationLogs ?? config.channelLogs;
      if (!channelId) {
        await interaction.editReply({ content: 'Set a moderation or channel log channel first.' });
        return;
      }
      const channel = interaction.guild?.channels.cache.get(channelId);
      if (!channel?.isTextBased()) {
        await interaction.editReply({ content: 'The configured log channel is missing or not text-based.' });
        return;
      }
      const embed = new EmbedBuilder()
        .setColor(0x19d68f)
        .setTitle('Logging test')
        .setDescription(`Logging is working. Requested by ${interaction.user}.`)
        .setTimestamp();
      await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
      await interaction.editReply({ content: `Sent a test entry to <#${channelId}>.` });
    }
  }
}
