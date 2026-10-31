import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Command, CommandCategory } from '../../structures/Command';

export default class SlowmodeCommand extends Command {
  public category: CommandCategory = 'moderation';
  public data = new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set this channel’s slowmode delay')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption((option) => option.setName('seconds').setDescription('Delay from 0 to 21600 seconds').setMinValue(0).setMaxValue(21600).setRequired(true));

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    const channel = interaction.channel;
    if (!channel || !('setRateLimitPerUser' in channel)) { await interaction.editReply('Slowmode can only be set in a text channel.'); return; }
    const seconds = interaction.options.getInteger('seconds', true);
    await channel.setRateLimitPerUser(seconds, `Set by ${interaction.user.tag}`);
    await interaction.editReply(seconds === 0 ? 'Slowmode is now off.' : `Slowmode is now ${seconds} seconds.`);
  }
}
