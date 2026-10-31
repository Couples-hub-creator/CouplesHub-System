import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Command, CommandCategory } from '../../structures/Command';
import { cleanReason, fetchModerationTarget } from '../../utils/moderation';
import { BotClient } from '../../structures/BotClient';

export default class WarnCommand extends Command {
  public category: CommandCategory = 'moderation';
  public data = new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Record a warning for a server member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) => option.setName('user').setDescription('Member to warn').setRequired(true))
    .addStringOption((option) => option.setName('reason').setDescription('Reason for the warning').setRequired(true).setMaxLength(500));

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    const user = interaction.options.getUser('user', true);
    if (user.bot) { await interaction.editReply('Bots cannot receive warnings.'); return; }
    const { error } = await fetchModerationTarget(interaction, user);
    if (error) { await interaction.editReply(error); return; }
    const guildId = interaction.guildId;
    if (!guildId) { await interaction.editReply('This command can only be used in a server.'); return; }
    const reason = cleanReason(interaction.options.getString('reason', true));
    const bot = interaction.client as BotClient;
    await bot.prisma.guild.upsert({ where: { guildId }, update: {}, create: { guildId } });
    await bot.prisma.user.upsert({
      where: { userId_guildId: { userId: user.id, guildId } },
      update: {},
      create: { userId: user.id, guildId },
    });
    const caseNumber = (await bot.prisma.infraction.count({ where: { guildId } })) + 1;
    await bot.prisma.infraction.create({
      data: { userId: user.id, guildId, moderatorId: interaction.user.id, type: 'warn', reason, caseNumber },
    });
    await interaction.editReply(`Warning recorded for **${user.tag}** as case #${caseNumber}. Reason: ${reason}`);
  }
}
