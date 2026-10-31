import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Command, CommandCategory } from '../../structures/Command';
import { cleanReason } from '../../utils/moderation';

export default class UnbanCommand extends Command {
  public category: CommandCategory = 'moderation';
  public data = new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a Discord user by ID')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption((option) => option.setName('user_id').setDescription('Discord user ID').setRequired(true))
    .addStringOption((option) => option.setName('reason').setDescription('Reason for lifting the ban').setMaxLength(500));

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    const id = interaction.options.getString('user_id', true).trim();
    if (!/^\d{17,20}$/.test(id)) { await interaction.editReply('Enter a valid Discord user ID.'); return; }
    const guild = interaction.guild;
    if (!guild) { await interaction.editReply('This command can only be used in a server.'); return; }
    const reason = cleanReason(interaction.options.getString('reason'));
    const existing = await guild.bans.fetch(id).catch(() => null);
    if (!existing) { await interaction.editReply('That user is not currently banned.'); return; }
    await guild.members.unban(id, `${reason} | Moderator: ${interaction.user.tag}`);
    await interaction.editReply(`Unbanned **${existing.user.tag}**. Reason: ${reason}`);
  }
}
