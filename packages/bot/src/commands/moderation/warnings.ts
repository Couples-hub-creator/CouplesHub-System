import { ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Command, CommandCategory } from '../../structures/Command';
import { BotClient } from '../../structures/BotClient';

export default class WarningsCommand extends Command {
  public category: CommandCategory = 'moderation';
  public data = new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View recent warnings for a server member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) => option.setName('user').setDescription('Member to review').setRequired(true));

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    const user = interaction.options.getUser('user', true);
    const guildId = interaction.guildId;
    if (!guildId) { await interaction.editReply('This command can only be used in a server.'); return; }
    const records = await (interaction.client as BotClient).prisma.infraction.findMany({
      where: { guildId, userId: user.id, type: 'warn' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    if (records.length === 0) { await interaction.editReply(`**${user.tag}** has no recorded warnings.`); return; }
    const description = records.map((record) => `**#${record.caseNumber}** · <t:${Math.floor(record.createdAt.getTime() / 1000)}:d> · ${record.reason || 'No reason provided'} · <@${record.moderatorId}>`).join('\n');
    const embed = new EmbedBuilder().setColor(0xd7b878).setTitle(`Warnings · ${user.tag}`).setDescription(description).setFooter({ text: `Showing ${records.length} most recent cases` });
    await interaction.editReply({ embeds: [embed] });
  }
}
