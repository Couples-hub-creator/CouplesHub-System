import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command, CommandCategory } from '../../structures/Command';
import { MusicManager } from '../../modules/music/MusicManager';

export default class ResumeCommand extends Command {
  public category: CommandCategory = 'music';
  public cooldown: number = 3;

  public data = new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume the paused song');

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const voiceChannel = interaction.member && 'voice' in interaction.member ? interaction.member.voice.channel : null;

    if (!voiceChannel) {
      await interaction.editReply('You need to be in a voice channel to resume!');
      return;
    }

    const musicManager = (interaction.client as any).musicManager as MusicManager;
    const queue = musicManager.getQueue(interaction.guildId!);

    if (!queue || !queue.currentTrack) {
      await interaction.editReply('There is nothing playing right now!');
      return;
    }

    if (!queue.paused) {
      await interaction.editReply('The song is not paused!');
      return;
    }

    queue.resume();
    await interaction.editReply('Resumed the song!');
  }
}
