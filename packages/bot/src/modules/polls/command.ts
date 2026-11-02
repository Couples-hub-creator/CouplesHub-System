import {
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type TextChannel,
} from 'discord.js';
import { Command } from '../../structures/Command';
import { loadPollConfig, type PollConfig } from './config';
import { endPoll, pollEmbed, pollButtons } from './service';

function parseDuration(input: string | null): number | null {
  if (!input) return 0;
  const match = /^(\d+)\s*(s|m|h|d)$/i.exec(input.trim());
  if (!match) return null;
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const factor = unit === 's' ? 1000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
  const ms = value * factor;
  return ms >= 30_000 && ms <= 2_592_000_000 ? ms : null;
}

export class PollCommand extends Command {
  public category = 'community' as const;
  public cooldown = 5;
  public permissions = {
    bot: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
  };

  public data = new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create and manage polls')
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Create a poll')
        .addStringOption((option) => option.setName('question').setDescription('Question').setRequired(true).setMaxLength(250))
        .addStringOption((option) => option.setName('option1').setDescription('Option 1').setRequired(true).setMaxLength(80))
        .addStringOption((option) => option.setName('option2').setDescription('Option 2').setRequired(true).setMaxLength(80))
        .addStringOption((option) => option.setName('option3').setDescription('Option 3').setMaxLength(80))
        .addStringOption((option) => option.setName('option4').setDescription('Option 4').setMaxLength(80))
        .addStringOption((option) => option.setName('option5').setDescription('Option 5').setMaxLength(80))
        .addStringOption((option) => option.setName('duration').setDescription('e.g. 30m, 2h, 1d; omit for no end'))
        .addBooleanOption((option) => option.setName('multi').setDescription('Allow multiple choices')),
    )
    .addSubcommand((sub) =>
      sub.setName('end').setDescription('End a poll now').addStringOption((option) => option.setName('id').setDescription('Poll ID').setRequired(true)),
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('List active polls')) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.guildId || !interaction.guild) return;
    const client = interaction.client as any;
    const config: PollConfig = await loadPollConfig(client.configStore, interaction.guildId);
    const sub = interaction.options.getSubcommand();

    if (sub === 'create') {
      if (!config.enabled) {
        await interaction.editReply({ content: 'Polls are disabled in this server.' });
        return;
      }
      const question = interaction.options.getString('question', true);
      const options = [1, 2, 3, 4, 5]
        .map((index) => interaction.options.getString(`option${index}`))
        .filter((value): value is string => Boolean(value?.trim()))
        .map((value) => value.trim());
      if (options.length < 2) {
        await interaction.editReply({ content: 'A poll needs at least two options.' });
        return;
      }
      if (options.length > config.maxOptions) {
        await interaction.editReply({ content: `This server allows at most ${config.maxOptions} options.` });
        return;
      }
      const duration = parseDuration(interaction.options.getString('duration'));
      if (duration === null) {
        await interaction.editReply({ content: 'Duration must be between 30 seconds and 30 days, such as `30m` or `2h`.' });
        return;
      }
      const multi = (interaction.options.getBoolean('multi') ?? false) && config.allowMultiSelect;
      const poll = await client.prisma.poll.create({
        data: {
          guildId: interaction.guildId,
          channelId: interaction.channelId,
          messageId: 'pending',
          question,
          options,
          multiSelect: multi,
          createdBy: interaction.user.id,
          endTime: duration ? new Date(Date.now() + duration) : null,
        },
      });
      const embed = await pollEmbed(client, { ...poll, options }, config);
      const row = pollButtons({ ...poll, options });
      const message = await (interaction.channel as TextChannel).send({ embeds: [embed], components: row.components.length ? [row] : [] });
      await client.prisma.poll.update({ where: { id: poll.id }, data: { messageId: message.id } });
      if (poll.endTime) {
        await client.scheduler.enqueue({
          type: 'poll:end',
          guildId: interaction.guildId,
          payload: { pollId: poll.id },
          runAt: poll.endTime,
          idempotencyKey: `poll-end:${poll.id}`,
        });
      }
      await interaction.editReply({ content: `Poll created. ID: \`${poll.id}\`` });
      return;
    }

    if (sub === 'list') {
      const polls = await client.prisma.poll.findMany({
        where: { guildId: interaction.guildId, ended: false },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      await interaction.editReply({
        content: polls.length
          ? polls
              .map(
                (poll: any) =>
                  `\`${poll.id}\` — **${poll.question}**${
                    poll.endTime ? ` ends <t:${Math.floor(poll.endTime.getTime() / 1000)}:R>` : ''
                  }`,
              )
              .join('\n')
          : 'No active polls.',
      });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.editReply({ content: 'You need Manage Server to end polls.' });
      return;
    }
    const ended = await endPoll(client, interaction.options.getString('id', true), config);
    await interaction.editReply({ content: ended ? 'Poll ended.' : 'That poll does not exist or has already ended.' });
  }
}
