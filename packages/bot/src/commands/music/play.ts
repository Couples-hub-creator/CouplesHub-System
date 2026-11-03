import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command, CommandCategory } from '../../structures/Command';
import { MusicManager } from '../../modules/music/MusicManager';
import { resolveTracks } from '../../modules/music/resolve';
import { logger } from '../../utils/logger';

export default class PlayCommand extends Command {
  public category: CommandCategory = 'music';
  public cooldown: number = 3;

  public data = new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song or add it to the queue')
    .addStringOption((option) =>
      option.setName('query').setDescription('Song name or URL').setRequired(true)
    ) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const query = interaction.options.getString('query', true);
    const voiceChannel = interaction.member && 'voice' in interaction.member ? interaction.member.voice.channel : null;
    const textChannel = interaction.channel;

    if (!voiceChannel) {
      await interaction.editReply('You need to be in a voice channel to play music!');
      return;
    }

    if (!textChannel || !textChannel.isTextBased()) {
      await interaction.editReply('This command can only be used in text channels!');
      return;
    }

    const musicManager = (interaction.client as any).musicManager as MusicManager;
    let queue = musicManager.getQueue(interaction.guildId!);

    if (!queue) {
      queue = musicManager.createQueue(interaction.guildId!, textChannel as any, voiceChannel);
    } else if (queue.voiceChannel.id !== voiceChannel.id) {
      await interaction.editReply('I am already playing in a different voice channel!');
      return;
    }

    try {
      const node = (interaction.client as any).shoukaku.nodes.get('default');
      if (!node) {
        await interaction.editReply('Lavalink node is not available!');
        return;
      }

      // Resolve the track. Plain queries search YouTube, then YouTube Music.
      const resolved = await resolveTracks(node, query);

      if (!resolved.tracks.length) {
        await interaction.editReply('No results found for your query!');
        return;
      }

      // A search result is a list of candidates, not a playlist. Only a real
      // playlist should enqueue every track.
      if (resolved.loadType === 'playlist') {
        queue.addTracks(resolved.tracks);
        await interaction.editReply(
          resolved.playlistName
            ? `Added **${resolved.playlistName}** (${resolved.tracks.length} tracks) to the queue!`
            : `Added **${resolved.tracks.length} tracks** to the queue!`,
        );
      } else {
        queue.addTrack(resolved.tracks[0]);
        await interaction.editReply(`Added **${resolved.tracks[0].info.title}** to the queue!`);
      }

      if (!queue.player) {
        await queue.connect();
      }

      if (!queue.currentTrack) {
        await queue.play();
      }
    } catch (error) {
      logger.error('Error in play command:', error);
      await interaction.editReply('There was an error playing the song!');
    }
  }
}
