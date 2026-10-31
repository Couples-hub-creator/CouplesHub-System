import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command, CommandCategory } from '../../structures/Command';
import { MusicManager } from '../../modules/music/MusicManager';

export default class NowPlayingCommand extends Command {
  public category: CommandCategory = 'music';
  public cooldown: number = 3;

  public data = new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('View the currently playing song');

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const musicManager = (interaction.client as any).musicManager as MusicManager;
    const queue = musicManager.getQueue(interaction.guildId!);

    if (!queue || !queue.currentTrack) {
      await interaction.editReply('There is nothing playing right now!');
      return;
    }

    const track = queue.currentTrack;
    const position = queue.player?.position || 0;
    const duration = track.info.length;
    const progressBar = this.createProgressBar(position, duration);

    const npEmbed = new EmbedBuilder()
      .setTitle('🎶 Now Playing')
      .setDescription(`**${track.info.title}**\n${track.info.author}`)
      .addFields(
        { name: 'Duration', value: `${this.formatTime(position)} / ${this.formatTime(duration)}`, inline: true },
        { name: 'Progress', value: progressBar, inline: false }
      )
      .setColor(0x00ff00);

    await interaction.editReply({ embeds: [npEmbed] });
  }

  private createProgressBar(position: number, duration: number): string {
    const length = 20;
    const progress = Math.round((position / duration) * length);
    const filled = '▰'.repeat(progress);
    const empty = '▱'.repeat(length - progress);
    return `${filled}${empty}`;
  }

  private formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}
