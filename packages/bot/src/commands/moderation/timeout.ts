import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Command, CommandCategory } from '../../structures/Command';
import { cleanReason, fetchModerationTarget } from '../../utils/moderation';

export default class TimeoutCommand extends Command {
  public category: CommandCategory = 'moderation';
  public data = new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Temporarily prevent a member from interacting')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) => option.setName('user').setDescription('Member to timeout').setRequired(true))
    .addIntegerOption((option) => option.setName('minutes').setDescription('Duration from 1 to 40320 minutes').setMinValue(1).setMaxValue(40320).setRequired(true))
    .addStringOption((option) => option.setName('reason').setDescription('Why this member is being timed out').setMaxLength(500));

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    const user = interaction.options.getUser('user', true);
    const minutes = interaction.options.getInteger('minutes', true);
    const reason = cleanReason(interaction.options.getString('reason'));
    const { target, error } = await fetchModerationTarget(interaction, user);
    if (error || !target) { await interaction.editReply(error ?? 'Unable to check the target member.'); return; }
    if (!target.moderatable) { await interaction.editReply('The bot needs Moderate Members permission and a higher role than the target.'); return; }
    await target.timeout(minutes * 60_000, `${reason} | Moderator: ${interaction.user.tag}`);
    await interaction.editReply(`Timed out **${user.tag}** for ${minutes} minute${minutes === 1 ? '' : 's'}. Reason: ${reason}`);
  }
}
