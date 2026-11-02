import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Role,
  type TextChannel,
} from 'discord.js';
import { Command } from '../../structures/Command';
import { loadGiveawayConfig } from './config';
import { endGiveaway, giveawayEmbed, parseDuration, rerollGiveaway } from './service';

export class GiveawayCommand extends Command {
  public category = 'giveaways' as const;
  public cooldown = 3;
  public permissions = {
    user: [PermissionFlagsBits.ManageGuild],
    bot: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
  };

  public data = new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Create and manage giveaways')
    .addSubcommand((sub) =>
      sub
        .setName('start')
        .setDescription('Start a giveaway')
        .addStringOption((option) => option.setName('prize').setDescription('Prize').setRequired(true).setMaxLength(200))
        .addStringOption((option) => option.setName('duration').setDescription('e.g. 30m, 2h, 3d').setRequired(true))
        .addIntegerOption((option) => option.setName('winners').setDescription('Number of winners').setMinValue(1).setMaxValue(50))
        .addRoleOption((option) => option.setName('required_role').setDescription('Role required to enter')),
    )
    .addSubcommand((sub) =>
      sub.setName('end').setDescription('End a giveaway now').addStringOption((option) => option.setName('id').setDescription('Giveaway ID').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub.setName('reroll').setDescription('Pick new winners').addStringOption((option) => option.setName('id').setDescription('Giveaway ID').setRequired(true)),
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('List active giveaways')) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.guildId || !interaction.guild) return;
    const client = interaction.client as any;
    const config = await loadGiveawayConfig(client.configStore, interaction.guildId);
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      if (!config.enabled) {
        await interaction.editReply({ content: 'Giveaways are disabled.' });
        return;
      }
      const prize = interaction.options.getString('prize', true);
      const duration = parseDuration(interaction.options.getString('duration', true));
      if (!duration) {
        await interaction.editReply({ content: 'Duration must be between 1 minute and 30 days, such as `30m`, `2h` or `3d`.' });
        return;
      }
      const winners = interaction.options.getInteger('winners') ?? config.defaultWinners;
      const requiredRole = interaction.options.getRole('required_role') as Role | null;
      const endTime = new Date(Date.now() + duration);
      const giveaway = await client.prisma.giveaway.create({
        data: {
          guildId: interaction.guildId,
          channelId: interaction.channelId,
          messageId: 'pending',
          prize,
          winners,
          endTime,
          hostedBy: interaction.user.id,
          requirements: requiredRole ? { requiredRole: requiredRole.id } : {},
        },
      });
      const embed = giveawayEmbed({ ...giveaway, ended: false }, 0, config);
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`giveaway:enter:${giveaway.id}`).setLabel('Enter').setStyle(ButtonStyle.Primary),
      );
      const message = await (interaction.channel as TextChannel).send({
        content: config.pingRole ? `<@&${config.pingRole}>` : undefined,
        embeds: [embed],
        components: [row],
        allowedMentions: { roles: config.pingRole ? [config.pingRole] : [] },
      });
      await client.prisma.giveaway.update({ where: { id: giveaway.id }, data: { messageId: message.id } });
      await client.scheduler.enqueue({
        type: 'giveaway:end',
        guildId: interaction.guildId,
        payload: { giveawayId: giveaway.id },
        runAt: endTime,
        idempotencyKey: `giveaway-end:${giveaway.id}`,
      });
      await interaction.editReply({ content: `Giveaway started. ID: \`${giveaway.id}\`` });
      return;
    }

    if (sub === 'list') {
      const giveaways = await client.prisma.giveaway.findMany({
        where: { guildId: interaction.guildId, ended: false },
        orderBy: { endTime: 'asc' },
      });
      await interaction.editReply({
        content: giveaways.length
          ? giveaways.map((giveaway: any) => `\`${giveaway.id}\` — **${giveaway.prize}** ends <t:${Math.floor(giveaway.endTime.getTime() / 1000)}:R>`).join('\n')
          : 'No active giveaways.',
      });
      return;
    }

    const id = interaction.options.getString('id', true);
    if (sub === 'end') {
      await endGiveaway(client, id, config);
      await interaction.editReply({ content: 'Giveaway ended.' });
    } else if (sub === 'reroll') {
      const winners = await rerollGiveaway(client, id, config);
      await interaction.editReply({ content: winners.length ? `New winners: ${winners.map((winner) => `<@${winner}>`).join(', ')}` : 'No eligible entries.' });
    }
  }
}
