import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Command, CommandCategory } from '../../structures/Command';

export default class UnlockCommand extends Command {
  public category: CommandCategory = 'moderation';
  public data = new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Restore the @everyone message permission in this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    const channel = interaction.channel;
    const guild = interaction.guild;
    if (!guild || !channel || !('permissionOverwrites' in channel)) { await interaction.editReply('This channel cannot be unlocked.'); return; }
    await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null }, { reason: `Unlocked by ${interaction.user.tag}` });
    await interaction.editReply('The @everyone message permission has been restored in this channel.');
  }
}
