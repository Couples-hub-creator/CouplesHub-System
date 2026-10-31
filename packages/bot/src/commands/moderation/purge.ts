import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Command, CommandCategory } from '../../structures/Command';

export default class PurgeCommand extends Command {
  public category: CommandCategory = 'moderation';
  public data = new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete recent messages from this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((option) => option.setName('amount').setDescription('Number of messages to delete (1–100)').setMinValue(1).setMaxValue(100).setRequired(true));

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    const channel = interaction.channel;
    if (!channel || !('bulkDelete' in channel)) { await interaction.editReply('This channel does not support bulk message deletion.'); return; }
    const amount = interaction.options.getInteger('amount', true);
    const deleted = await channel.bulkDelete(amount, true);
    await interaction.editReply(`Deleted ${deleted.size} recent messages. Messages older than 14 days are skipped by Discord.`);
  }
}
