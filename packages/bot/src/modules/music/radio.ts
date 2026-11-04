import {
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type TextChannel,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { BotClient } from '../../structures/BotClient';
import type { MusicManager, Track } from './MusicManager';
import { resolveTracks } from './resolve';
import { ensureBuiltInStations } from './stations';

export class RadioCommand extends Command {
  public category = 'music' as const;
  public cooldown = 4;
  public permissions = {
    bot: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
  };

  public data = new SlashCommandBuilder()
    .setName('radio')
    .setDescription('Play and manage radio stations')
    .addSubcommand((sub) =>
      sub
        .setName('play')
        .setDescription('Play a radio station')
        .addStringOption((option) => option.setName('station').setDescription('Station name or ID').setRequired(true)),
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('List radio stations'))
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add a custom station')
        .addStringOption((option) => option.setName('name').setDescription('Station name').setRequired(true).setMaxLength(80))
        .addStringOption((option) => option.setName('url').setDescription('Direct stream URL').setRequired(true).setMaxLength(500))
        .addStringOption((option) => option.setName('genre').setDescription('Genre').setMaxLength(40)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Delete a custom station')
        .addStringOption((option) => option.setName('station').setDescription('Station name or ID').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('favorite')
        .setDescription('Toggle a station favorite')
        .addStringOption((option) => option.setName('station').setDescription('Station name or ID').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('247')
        .setDescription('Keep the current station playing 24/7')
        .addBooleanOption((option) => option.setName('enabled').setDescription('Enabled').setRequired(true)),
    ) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();
    if (!interaction.guildId || !interaction.guild) return;
    const client = interaction.client as BotClient;
    const sub = interaction.options.getSubcommand();

    await ensureBuiltInStations(client.prisma, interaction.guildId).catch(() => undefined);

    if (sub === 'list') {
      const stations = await client.prisma.radioStation.findMany({
        where: { guildId: interaction.guildId },
        orderBy: [{ favorite: 'desc' }, { name: 'asc' }],
        take: 50,
      });
      if (!stations.length) {
        await interaction.editReply({ content: 'No radio stations yet. Add one with `/radio add`.' });
        return;
      }
      const embed = new EmbedBuilder()
        .setColor(0x19d68f)
        .setTitle('Radio stations')
        .setDescription(
          stations
            .map((station) => `${station.favorite ? '★ ' : ''}**${station.name}** — ${station.genre} • \`${station.id}\``)
            .join('\n'),
        );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (sub === 'add') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.editReply({ content: 'You need Manage Server to add stations.' });
        return;
      }
      const url = interaction.options.getString('url', true).trim();
      if (!/^https?:\/\//i.test(url)) {
        await interaction.editReply({ content: 'The stream URL must start with http:// or https://.' });
        return;
      }
      const name = interaction.options.getString('name', true).trim().slice(0, 80);
      const duplicate = await client.prisma.radioStation.findFirst({
        where: { guildId: interaction.guildId, name: { equals: name, mode: 'insensitive' } },
      });
      if (duplicate) {
        await interaction.editReply({ content: 'A station with that name already exists.' });
        return;
      }
      const station = await client.prisma.radioStation.create({
        data: {
          guildId: interaction.guildId,
          name,
          streamUrl: url,
          genre: (interaction.options.getString('genre') ?? 'custom').trim().slice(0, 40) || 'custom',
          isCustom: true,
        },
      }).catch(() => null);
      if (!station) {
        await interaction.editReply({ content: 'Could not save that station.' });
        return;
      }
      await interaction.editReply({ content: `Station added: **${station.name}** (\`${station.id}\`).` });
      return;
    }

    const query = interaction.options.getString('station', true).trim();
    const station = await client.prisma.radioStation.findFirst({
      where: {
        guildId: interaction.guildId,
        OR: [{ id: query }, { name: { equals: query, mode: 'insensitive' } }],
      },
    });
    if (!station) {
      await interaction.editReply({ content: 'That station does not exist. Use `/radio list`.' });
      return;
    }

    if (sub === 'remove') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.editReply({ content: 'You need Manage Server to delete stations.' });
        return;
      }
      if (!station.isCustom) {
        await interaction.editReply({ content: 'Only custom stations can be deleted.' });
        return;
      }
      await client.prisma.$transaction([
        client.prisma.radioStation.delete({ where: { id: station.id } }),
        client.prisma.musicSettings.updateMany({
          where: { guildId: interaction.guildId, lastRadioStationId: station.id },
          data: { lastRadioStationId: null },
        }),
      ]);
      await interaction.editReply({ content: `Deleted **${station.name}**.` });
      return;
    }

    if (sub === 'favorite') {
      const updated = await client.prisma.radioStation.update({ where: { id: station.id }, data: { favorite: !station.favorite } });
      await interaction.editReply({ content: updated.favorite ? `Starred **${updated.name}**.` : `Unstarred **${updated.name}**.` });
      return;
    }

    const settings = await client.prisma.musicSettings.upsert({
      where: { guildId: interaction.guildId },
      update: {},
      create: { guildId: interaction.guildId },
    });

    if (sub === '247') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.editReply({ content: 'You need Manage Server to change 24/7 mode.' });
        return;
      }
      const enabled = interaction.options.getBoolean('enabled', true);
      await client.prisma.musicSettings.update({
        where: { guildId: interaction.guildId },
        data: {
          twentyFourSeven: enabled,
          twentyFourSevenChannel: enabled ? (interaction.member && 'voice' in interaction.member ? interaction.member.voice.channelId : null) : null,
        },
      });
      await interaction.editReply({ content: enabled ? '24/7 mode enabled for this server.' : '24/7 mode disabled.' });
      return;
    }

    const member = interaction.member && 'voice' in interaction.member ? interaction.member : null;
    const voiceChannel = member?.voice.channel;
    if (!voiceChannel) {
      await interaction.editReply({ content: 'Join a voice channel first.' });
      return;
    }
    if (!interaction.channel?.isTextBased()) {
      await interaction.editReply({ content: 'Use this in a text channel.' });
      return;
    }
    const node = (client as any).shoukaku.nodes.get('default');
    if (!node) {
      await interaction.editReply({ content: 'Lavalink is not connected.' });
      return;
    }
    try {
      const resolved = await resolveTracks(node, station.streamUrl, { searchFallback: false });
      const tracks = resolved.tracks;
      if (!tracks.length) {
        await interaction.editReply({ content: 'That stream could not be resolved.' });
        return;
      }
      const musicManager = (client as any).musicManager as MusicManager;
      let queue = musicManager.getQueue(interaction.guildId);
      if (!queue) {
        queue = musicManager.createQueue(interaction.guildId, interaction.channel as TextChannel, voiceChannel);
      } else if (queue.voiceChannel.id !== voiceChannel.id) {
        await interaction.editReply({ content: 'I am already playing in a different voice channel.' });
        return;
      }
      const track: Track = { encoded: tracks[0].encoded, info: tracks[0].info };
      queue.addTrack(track);
      queue.loop = 'track';
      if (!queue.player) await queue.connect();
      if (!queue.currentTrack) await queue.play();
      await client.prisma.musicSettings.update({
        where: { guildId: interaction.guildId },
        data: {
          lastRadioStationId: station.id,
          radioTextChannelId: interaction.channelId,
          ...(settings.twentyFourSeven ? { twentyFourSevenChannel: voiceChannel.id } : {}),
        },
      }).catch(() => undefined);
      const embed = new EmbedBuilder()
        .setColor(0x19d68f)
        .setTitle(station.name)
        .setDescription(`${station.genre} • ${station.isCustom ? 'Custom station' : 'Radio'}${settings.twentyFourSeven ? ' • 24/7' : ''}`)
        .setFooter({ text: `Station ID: ${station.id}` });
      if (station.logoUrl) embed.setThumbnail(station.logoUrl);
      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply({ content: 'There was an error starting that station.' });
    }
  }
}
