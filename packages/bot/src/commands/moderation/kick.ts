import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { Command, CommandCategory } from '../../structures/Command';

export default class KickCommand extends Command {
  public category: CommandCategory = 'moderation';
  public cooldown: number = 5;
  public permissions = {
    user: [PermissionFlagsBits.KickMembers],
    bot: [PermissionFlagsBits.KickMembers],
  };

  public data = new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user from the server')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to kick').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('The reason for the kick')
    ) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!interaction.guild) {
      await interaction.editReply('This command can only be used in a server.');
      return;
    }

    if (user.id === interaction.user.id) {
      await interaction.editReply('You cannot kick yourself!');
      return;
    }

    try {
      await interaction.guild.members.kick(user, reason);
      await interaction.editReply(`Successfully kicked ${user.tag} for: ${reason}`);
    } catch (error) {
      console.error('Error kicking user:', error);
      await interaction.editReply('Failed to kick the user. I may not have sufficient permissions.');
    }
  }
}
