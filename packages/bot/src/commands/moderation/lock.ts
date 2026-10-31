import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Command, CommandCategory } from '../../structures/Command';

export default class LockCommand extends Command {
  public category: CommandCategory = 'moderation';
  public data = new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Prevent @everyone from sending messages in this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    const channel = interaction.channel;
    const guild = interaction.guild;
    if (!guild || !channel || !('permissionOverwrites' in channel)) { await interaction.editReply('This channel cannot be locked.'); return; }
    await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false }, { reason: `Locked by ${interaction.user.tag}` });
    await interaction.editReply('This channel is locked for @everyone.');
  }
}
