import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { Command, CommandCategory } from '../../structures/Command';
import { MusicManager } from '../../modules/music/MusicManager';

export default class NowPlayingCommand extends Command {
  public category: CommandCategory = 'music';
  public cooldown: number = 3;

  public data = new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('View the currently playing song with controls');

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

    // Create control buttons
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('music_previous')
          .setLabel('⏮')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('music_pause')
          .setLabel(queue.player?.paused ? '▶️' : '⏸')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('music_skip')
          .setLabel('⏭')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('music_stop')
          .setLabel('⏹')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('music_loop')
          .setLabel(queue.loop === 'off' ? '�' : '�')
          .setStyle(ButtonStyle.Secondary)
      );

    // Create volume control buttons
    const volumeRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('volume_down')
          .setLabel('🔉')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('volume_mute')
          .setLabel(queue.muted ? '🔇' : '🔊')
          .setStyle(queue.muted ? ButtonStyle.Danger : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('volume_up')
          .setLabel('🔊')
          .setStyle(ButtonStyle.Secondary)
      );

    const npEmbed = new EmbedBuilder()
      .setTitle('🎶 Now Playing')
      .setDescription(`**${track.info.title}**\n${track.info.author}`)
      .addFields(
        { name: 'Duration', value: `${this.formatTime(position)} / ${this.formatTime(duration)}`, inline: true },
        { name: 'Progress', value: progressBar, inline: false },
        { name: 'Volume', value: queue.muted ? 'Muted' : `${queue.volume}%`, inline: true }
      )
      .setColor(0x00ff00);

    const response = await interaction.editReply({
      embeds: [npEmbed],
      components: [row, volumeRow],
    });

    // Collect button interactions
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000 * 5, // 5 minutes
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        await i.reply({ content: 'Only the person who used the command can use these buttons!', ephemeral: true });
        return;
      }

      const currentQueue = musicManager.getQueue(interaction.guildId!);
      if (!currentQueue) {
        await i.update({ content: 'Queue has been cleared.', components: [], embeds: [] });
        collector.stop();
        return;
      }

      switch (i.customId) {
        case 'music_previous':
          if (currentQueue.previousTrack) {
            currentQueue.playPrevious();
            await i.update({ content: '⏮ Playing previous track...', components: [], embeds: [] });
          } else {
            await i.reply({ content: 'No previous track!', ephemeral: true });
          }
          break;

        case 'music_pause':
          if (currentQueue.player?.paused) {
            await currentQueue.resume();
            await i.update({ content: '▶️ Resumed!', components: [], embeds: [] });
          } else {
            await currentQueue.pause();
            await i.update({ content: '⏸ Paused!', components: [], embeds: [] });
          }
          break;

        case 'music_skip':
          await currentQueue.skip();
          await i.update({ content: '⏭ Skipped!', components: [], embeds: [] });
          break;

        case 'music_stop':
          await currentQueue.stop();
          await i.update({ content: '⏹ Stopped!', components: [], embeds: [] });
          break;

        case 'music_loop':
          if (currentQueue.loop === 'off') {
            currentQueue.loop = 'track';
            await i.update({ content: '🔁 Loop enabled!', components: [], embeds: [] });
          } else {
            currentQueue.loop = 'off';
            await i.update({ content: '🔀 Loop disabled!', components: [], embeds: [] });
          }
          break;

        case 'volume_down':
          currentQueue.volume = Math.max(0, currentQueue.volume - 10);
          await currentQueue.player?.setGlobalVolume(currentQueue.volume);
          await i.update({ content: `🔉 Volume: ${currentQueue.volume}%`, components: [], embeds: [] });
          break;

        case 'volume_mute':
          currentQueue.muted = !currentQueue.muted;
          if (currentQueue.muted) {
            await currentQueue.player?.setGlobalVolume(0);
          } else {
            await currentQueue.player?.setGlobalVolume(currentQueue.volume);
          }
          await i.update({ content: currentQueue.muted ? '🔇 Muted!' : '🔊 Unmuted!', components: [], embeds: [] });
          break;

        case 'volume_up':
          currentQueue.volume = Math.min(100, currentQueue.volume + 10);
          await currentQueue.player?.setGlobalVolume(currentQueue.volume);
          await i.update({ content: `🔊 Volume: ${currentQueue.volume}%`, components: [], embeds: [] });
          break;
      }

      // Refresh the nowplaying display after action
      setTimeout(async () => {
        const updatedQueue = musicManager.getQueue(interaction.guildId!);
        if (updatedQueue && updatedQueue.currentTrack) {
          const newTrack = updatedQueue.currentTrack;
          const newPosition = updatedQueue.player?.position || 0;
          const newDuration = newTrack.info.length;
          const newProgressBar = this.createProgressBar(newPosition, newDuration);

          const newRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('music_previous')
                .setLabel('⏮')
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId('music_pause')
                .setLabel(updatedQueue.player?.paused ? '▶️' : '⏸')
                .setStyle(ButtonStyle.Primary),
              new ButtonBuilder()
                .setCustomId('music_skip')
                .setLabel('⏭')
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId('music_stop')
                .setLabel('⏹')
                .setStyle(ButtonStyle.Danger),
              new ButtonBuilder()
                .setCustomId('music_loop')
                .setLabel(updatedQueue.loop === 'off' ? '�' : '�')
                .setStyle(ButtonStyle.Secondary)
            );

          const newVolumeRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('volume_down')
                .setLabel('🔉')
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId('volume_mute')
                .setLabel(updatedQueue.muted ? '🔇' : '🔊')
                .setStyle(updatedQueue.muted ? ButtonStyle.Danger : ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId('volume_up')
                .setLabel('🔊')
                .setStyle(ButtonStyle.Secondary)
            );

          const newNpEmbed = new EmbedBuilder()
            .setTitle('🎶 Now Playing')
            .setDescription(`**${newTrack.info.title}**\n${newTrack.info.author}`)
            .addFields(
              { name: 'Duration', value: `${this.formatTime(newPosition)} / ${this.formatTime(newDuration)}`, inline: true },
              { name: 'Progress', value: newProgressBar, inline: false },
              { name: 'Volume', value: updatedQueue.muted ? 'Muted' : `${updatedQueue.volume}%`, inline: true }
            )
            .setColor(0x00ff00);

          await interaction.editReply({
            embeds: [newNpEmbed],
            components: [newRow, newVolumeRow],
          });
        }
      }, 1000);
    });

    collector.on('end', async (collected) => {
      if (collected.size === 0) {
        await interaction.editReply({ components: [] });
      }
    });
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
