import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command, CommandCategory } from '../../structures/Command';
import { MusicManager } from '../../modules/music/MusicManager';

export default class StopCommand extends Command {
  public category: CommandCategory = 'music';
  public cooldown: number = 3;

  public data = new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop the music and clear the queue');

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const voiceChannel = interaction.member && 'voice' in interaction.member ? interaction.member.voice.channel : null;

    if (!voiceChannel) {
      await interaction.editReply('You need to be in a voice channel to stop!');
      return;
    }

    const musicManager = (interaction.client as any).musicManager as MusicManager;
    const queue = musicManager.getQueue(interaction.guildId!);

    if (!queue || !queue.currentTrack) {
      await interaction.editReply('There is nothing playing right now!');
      return;
    }

    queue.stop();
    musicManager.deleteQueue(interaction.guildId!);
    await interaction.editReply('Stopped the music and cleared the queue!');
  }
}
