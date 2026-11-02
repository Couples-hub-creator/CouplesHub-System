import { EmbedBuilder, SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../structures/Command';
import { t } from '../../core/i18n';
import { localeOf } from '../../core/permissions';
import { loadLevelingConfig } from './config';

export class LeaderboardCommand extends Command {
  public category = 'leveling' as const;
  public cooldown = 8;

  public data = new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the server XP leaderboard')
    .addStringOption((option) =>
      option
        .setName('period')
        .setDescription('Time window')
        .addChoices(
          { name: 'All time', value: 'all' },
          { name: 'This week', value: 'week' },
          { name: 'This month', value: 'month' },
        ),
    )
    .addStringOption((option) =>
      option
        .setName('kind')
        .setDescription('XP source')
        .addChoices(
          { name: 'Text', value: 'text' },
          { name: 'Voice', value: 'voice' },
        ),
    ) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();
    if (!interaction.guildId || !interaction.guild) return;
    const client = interaction.client as any;
    const config = await loadLevelingConfig(client.prisma, client.configStore, interaction.guildId);
    if (!config.enabled) {
      await interaction.editReply({ content: t(localeOf(interaction), 'leveling.disabled') });
      return;
    }

    const period = interaction.options.getString('period') ?? 'all';
    const kind = interaction.options.getString('kind') ?? 'text';
    let rows: Array<{ userId: string; xp: number }> = [];

    if (period === 'all') {
      const users = await client.prisma.user.findMany({
        where: { guildId: interaction.guildId },
        orderBy: { xp: 'desc' },
        take: 10,
        select: { userId: true, xp: true },
      });
      rows = users;
    } else {
      const since = new Date(Date.now() - (period === 'month' ? 30 : 7) * 86_400_000);
      const events = await client.prisma.xpEvent.findMany({
        where: { guildId: interaction.guildId, source: kind === 'voice' ? 'voice' : 'text', createdAt: { gte: since } },
        select: { userId: true, amount: true },
      });
      const totals = new Map<string, number>();
      for (const event of events) totals.set(event.userId, (totals.get(event.userId) ?? 0) + event.amount);
      rows = Array.from(totals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([userId, xp]) => ({ userId, xp }));
    }

    if (!rows.length) {
      await interaction.editReply({ content: t(localeOf(interaction), 'leveling.empty') });
      return;
    }

    const lines = await Promise.all(
      rows.map(async (row, index) => {
        const member = await interaction.guild!.members.fetch(row.userId).catch(() => null);
        const name = member?.displayName ?? `<@${row.userId}>`;
        return `**${index + 1}.** ${name} — **${row.xp.toLocaleString('en-US')} XP**`;
      }),
    );

    const embed = new EmbedBuilder()
      .setColor(0x19d68f)
      .setTitle(`${interaction.guild.name} leaderboard`)
      .setDescription(lines.join('\n'))
      .setFooter({
        text: `${period === 'all' ? 'All time' : period === 'month' ? 'Last 30 days' : 'Last 7 days'} • ${kind} XP`,
      })
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  }
}
