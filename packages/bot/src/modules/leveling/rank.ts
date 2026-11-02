import { AttachmentBuilder, EmbedBuilder, SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../structures/Command';
import { t } from '../../core/i18n';
import { localeOf } from '../../core/permissions';
import { buildTemplate } from '../../core/cards/templates';
import { renderCardPooled } from '../../core/cards/pool';
import type { CardSample } from '../../core/cards/types';
import { loadLevelingConfig } from './config';
import { getLevelingService } from './service';

export class RankCommand extends Command {
  public category = 'leveling' as const;
  public cooldown = 5;

  public data = new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Show a member’s level and XP')
    .addUserOption((option) => option.setName('user').setDescription('Member to look up')) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();
    if (!interaction.guildId || !interaction.guild) return;
    const target = interaction.options.getUser('user') ?? interaction.user;
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      await interaction.editReply({ content: 'That member is not in this server.' });
      return;
    }
    const client = interaction.client as any;
    const config = await loadLevelingConfig(client.prisma, client.configStore, interaction.guildId);
    if (!config.enabled) {
      await interaction.editReply({ content: t(localeOf(interaction), 'leveling.disabled') });
      return;
    }
    const service = getLevelingService();
    const stats = await service.getStats(interaction.guildId, target.id);
    const sample: CardSample = {
      username: member.user.username,
      displayName: member.displayName,
      avatarUrl: member.displayAvatarURL({ extension: 'png', size: 512 }),
      serverName: interaction.guild.name,
      serverIconUrl: interaction.guild.iconURL({ extension: 'png', size: 256 }),
      memberCount: interaction.guild.memberCount,
      level: stats.level,
      rank: stats.rank,
      xp: stats.xp,
    };

    if (config.rankCard) {
      try {
        const png = await renderCardPooled(buildTemplate('rank', config.cardTemplate, sample), sample);
        await interaction.editReply({ files: [new AttachmentBuilder(png, { name: 'rank.png' })] });
        return;
      } catch {
        // Fall back to the text embed below.
      }
    }

    const embed = new EmbedBuilder()
      .setColor(0x19d68f)
      .setAuthor({ name: member.displayName, iconURL: member.displayAvatarURL({ extension: 'png', size: 128 }) })
      .setDescription(t(localeOf(interaction), 'leveling.rank', { user: member.displayName, level: stats.level, xp: stats.xp }))
      .addFields(
        { name: 'Rank', value: `#${stats.rank}`, inline: true },
        { name: 'Level', value: String(stats.level), inline: true },
        { name: 'XP', value: `${stats.progress.current}/${stats.progress.needed}`, inline: true },
        { name: 'Progress', value: service.displayProgress(stats.xp) },
      );
    await interaction.editReply({ embeds: [embed] });
  }
}
