import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command, CommandCategory } from '../../structures/Command';
import { MusicManager } from '../../modules/music/MusicManager';

export default class SeekCommand extends Command {
  public category: CommandCategory = 'music';
  public cooldown: number = 3;

  public data = new SlashCommandBuilder()
    .setName('seek')
    .setDescription('Seek to a specific position in the current track')
    .addIntegerOption((option) =>
      option.setName('seconds').setDescription('Position in seconds').setRequired(true).setMinValue(0)
    );

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const musicManager = (interaction.client as any).musicManager as MusicManager;
    const queue = musicManager.getQueue(interaction.guildId!);

    if (!queue || !queue.currentTrack) {
      await interaction.editReply('No music is currently playing!');
      return;
    }

    const seconds = interaction.options.getInteger('seconds', true);
    const duration = queue.currentTrack.info.length / 1000;

    if (seconds > duration) {
      await interaction.editReply(`Cannot seek beyond the track duration (${Math.floor(duration)}s)!`);
      return;
    }

    queue.seek(seconds);

    const positionMinutes = Math.floor(seconds / 60);
    const positionSeconds = seconds % 60;

    await interaction.editReply(`⏩ Seeked to ${positionMinutes}:${positionSeconds.toString().padStart(2, '0')}`);
  }
}
