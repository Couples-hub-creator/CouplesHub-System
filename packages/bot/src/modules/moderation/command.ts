import {
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { Command } from '../../structures/Command';
import { loadModerationConfig, saveModerationConfig, type ModerationConfig } from './config';

export class ModerationCommand extends Command {
  public category = 'moderation' as const;
  public cooldown = 3;
  public permissions = {
    user: [PermissionFlagsBits.ManageGuild],
    bot: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
  };

  public data = new SlashCommandBuilder()
    .setName('moderation')
    .setDescription('Configure moderation behaviour')
    .addSubcommand((sub) => sub.setName('show').setDescription('Show the moderation configuration'))
    .addSubcommand((sub) =>
      sub
        .setName('maxwarns')
        .setDescription('Warnings before an automatic ban; 0 disables it')
        .addIntegerOption((option) => option.setName('count').setDescription('0 to 100').setRequired(true).setMinValue(0).setMaxValue(100)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('muteduration')
        .setDescription('Default timeout duration')
        .addIntegerOption((option) =>
          option.setName('minutes').setDescription('1 to 40320').setRequired(true).setMinValue(1).setMaxValue(40320),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('warnexpiry')
        .setDescription('Days before a warning stops counting')
        .addIntegerOption((option) => option.setName('days').setDescription('0 for never').setRequired(true).setMinValue(0).setMaxValue(3650)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('dm')
        .setDescription('DM members when they are punished')
        .addBooleanOption((option) => option.setName('enabled').setDescription('Enabled').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('requirereason')
        .setDescription('Require a reason on moderation commands')
        .addBooleanOption((option) => option.setName('enabled').setDescription('Enabled').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('appeal')
        .setDescription('Set or clear the appeal URL sent in punishment DMs')
        .addStringOption((option) => option.setName('url').setDescription('https://…; omit to clear')),
    ) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.guildId) return;
    const client = interaction.client as any;
    let config: ModerationConfig = await loadModerationConfig(client.prisma, client.configStore, interaction.guildId);
    const sub = interaction.options.getSubcommand();

    const save = async (next: ModerationConfig) => {
      config = await saveModerationConfig(client.prisma, client.configStore, interaction.guildId!, next, {
        id: interaction.user.id,
        name: interaction.user.tag,
      });
    };

    if (sub === 'show') {
      const embed = new EmbedBuilder()
        .setColor(0x19d68f)
        .setTitle('Moderation configuration')
        .addFields(
          { name: 'Warnings before ban', value: config.maxWarnsBeforeBan ? String(config.maxWarnsBeforeBan) : 'Disabled', inline: true },
          { name: 'Default timeout', value: `${Math.round(config.defaultMuteDuration / 60_000)} min`, inline: true },
          { name: 'Warning expiry', value: config.warnExpiryDays ? `${config.warnExpiryDays} days` : 'Never', inline: true },
          { name: 'Punishment DM', value: config.dmOnPunish ? 'On' : 'Off', inline: true },
          { name: 'Require reason', value: config.requireReason ? 'Yes' : 'No', inline: true },
          { name: 'Appeal URL', value: config.appealUrl ?? 'Not set', inline: true },
        );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (sub === 'maxwarns') {
      await save({ ...config, maxWarnsBeforeBan: interaction.options.getInteger('count', true) });
    } else if (sub === 'muteduration') {
      await save({ ...config, defaultMuteDuration: interaction.options.getInteger('minutes', true) * 60_000 });
    } else if (sub === 'warnexpiry') {
      await save({ ...config, warnExpiryDays: interaction.options.getInteger('days', true) });
    } else if (sub === 'dm') {
      await save({ ...config, dmOnPunish: interaction.options.getBoolean('enabled', true) });
    } else if (sub === 'requirereason') {
      await save({ ...config, requireReason: interaction.options.getBoolean('enabled', true) });
    } else if (sub === 'appeal') {
      const url = interaction.options.getString('url');
      if (url && !/^https?:\/\//i.test(url)) {
        await interaction.editReply({ content: 'The appeal URL must start with http:// or https://' });
        return;
      }
      await save({ ...config, appealUrl: url ?? null });
    }

    await interaction.editReply({ content: 'Moderation configuration updated.' });
  }
}
