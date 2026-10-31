import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command, CommandCategory } from '../../structures/Command';
import { MusicManager } from '../../modules/music/MusicManager';

export default class QueueCommand extends Command {
  public category: CommandCategory = 'music';
  public cooldown: number = 5;

  public data = new SlashCommandBuilder()
    .setName('queue')
    .setDescription('View the current queue');

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const musicManager = (interaction.client as any).musicManager as MusicManager;
    const queue = musicManager.getQueue(interaction.guildId!);

    if (!queue || queue.tracks.length === 0) {
      await interaction.editReply('The queue is empty!');
      return;
    }

    const queueEmbed = new EmbedBuilder()
      .setTitle('🎵 Music Queue')
      .setColor(0x00ff00)
      .setDescription(
        queue.tracks
          .slice(0, 10)
          .map((track, index) => `${index + 1}. **${track.info.title}** - ${track.info.author}`)
          .join('\n')
      )
      .setFooter({ text: `Total: ${queue.tracks.length} tracks` });

    await interaction.editReply({ embeds: [queueEmbed] });
  }
}
