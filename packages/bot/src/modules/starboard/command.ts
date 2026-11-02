import { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, type ChatInputCommandInteraction, type TextChannel } from 'discord.js';
import { Command } from '../../structures/Command';
import { loadStarboardConfig, saveStarboardConfig, type StarboardConfig } from './config';

export class StarboardCommand extends Command {
  public category = 'community' as const;
  public cooldown = 3;
  public permissions = {
    user: [PermissionFlagsBits.ManageGuild],
    bot: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ManageMessages],
  };

  public data = new SlashCommandBuilder()
    .setName('starboard')
    .setDescription('Configure the starboard')
    .addSubcommand((sub) => sub.setName('status').setDescription('Show the starboard configuration'))
    .addSubcommand((sub) =>
      sub
        .setName('channel')
        .setDescription('Set the starboard channel')
        .addChannelOption((option) => option.setName('channel').setDescription('Channel; omit to clear')),
    )
    .addSubcommand((sub) =>
      sub
        .setName('threshold')
        .setDescription('Stars required')
        .addIntegerOption((option) => option.setName('count').setDescription('1 to 50').setRequired(true).setMinValue(1).setMaxValue(50)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('emoji')
        .setDescription('Reaction emoji')
        .addStringOption((option) => option.setName('emoji').setDescription('Emoji').setRequired(true).setMaxLength(64)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('toggle')
        .setDescription('Enable or disable the starboard')
        .addBooleanOption((option) => option.setName('enabled').setDescription('Enabled').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('selfstar')
        .setDescription('Allow authors to star their own messages')
        .addBooleanOption((option) => option.setName('enabled').setDescription('Enabled').setRequired(true)),
    ) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.guildId) return;
    const client = interaction.client as any;
    let config: StarboardConfig = await loadStarboardConfig(client.configStore, interaction.guildId);
    const sub = interaction.options.getSubcommand();
    const save = async (next: StarboardConfig) => {
      config = await saveStarboardConfig(client.configStore, interaction.guildId!, next, {
        id: interaction.user.id,
        name: interaction.user.tag,
      });
    };

    if (sub === 'status') {
      const embed = new EmbedBuilder()
        .setColor(0x19d68f)
        .setTitle('Starboard')
        .addFields(
          { name: 'Enabled', value: config.enabled ? 'Yes' : 'No', inline: true },
          { name: 'Channel', value: config.channelId ? `<#${config.channelId}>` : 'Not set', inline: true },
          { name: 'Emoji', value: config.emoji, inline: true },
          { name: 'Threshold', value: String(config.threshold), inline: true },
          { name: 'Self stars', value: config.selfStar ? 'Allowed' : 'Blocked', inline: true },
          { name: 'Bots', value: config.allowBots ? 'Allowed' : 'Blocked', inline: true },
        );
      await interaction.editReply({ embeds: [embed] });
      return;
    }
    if (sub === 'channel') {
      const channel = interaction.options.getChannel('channel') as TextChannel | null;
      await save({ ...config, channelId: channel?.id ?? null, enabled: Boolean(channel) });
    } else if (sub === 'threshold') {
      await save({ ...config, threshold: interaction.options.getInteger('count', true) });
    } else if (sub === 'emoji') {
      await save({ ...config, emoji: interaction.options.getString('emoji', true) });
    } else if (sub === 'toggle') {
      await save({ ...config, enabled: interaction.options.getBoolean('enabled', true) });
    } else if (sub === 'selfstar') {
      await save({ ...config, selfStar: interaction.options.getBoolean('enabled', true) });
    }
    await interaction.editReply({ content: 'Starboard configuration updated.' });
  }
}
