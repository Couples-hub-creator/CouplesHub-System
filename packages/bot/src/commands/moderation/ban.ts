import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { Command, CommandCategory } from '../../structures/Command';

export default class BanCommand extends Command {
  public category: CommandCategory = 'moderation';
  public cooldown: number = 5;
  public permissions = {
    user: [PermissionFlagsBits.BanMembers],
    bot: [PermissionFlagsBits.BanMembers],
  };

  public data = new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to ban').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('The reason for the ban')
    )
    .addIntegerOption((option) =>
      option.setName('days').setDescription('Delete messages from this many days').setMaxValue(7)
    ) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const days = interaction.options.getInteger('days') || 0;

    if (!interaction.guild) {
      await interaction.editReply('This command can only be used in a server.');
      return;
    }

    if (user.id === interaction.user.id) {
      await interaction.editReply('You cannot ban yourself!');
      return;
    }

    if (user.id === interaction.client.user?.id) {
      await interaction.editReply('I cannot ban myself!');
      return;
    }

    try {
      await interaction.guild.bans.create(user, { reason, deleteMessageDays: days });
      await interaction.editReply(`Successfully banned ${user.tag} for: ${reason}`);
    } catch (error) {
      console.error('Error banning user:', error);
      await interaction.editReply('Failed to ban the user. I may not have sufficient permissions.');
    }
  }
}
