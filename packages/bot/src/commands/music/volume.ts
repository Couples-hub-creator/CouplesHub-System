import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command, CommandCategory } from '../../structures/Command';
import { MusicManager } from '../../modules/music/MusicManager';

export default class VolumeCommand extends Command {
  public category: CommandCategory = 'music';
  public cooldown: number = 3;

  public data = new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set the volume')
    .addIntegerOption((option) =>
      option.setName('level').setDescription('Volume level (0-100)').setRequired(true).setMinValue(0).setMaxValue(100)
    ) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const volume = interaction.options.getInteger('level', true);
    const voiceChannel = interaction.member && 'voice' in interaction.member ? interaction.member.voice.channel : null;

    if (!voiceChannel) {
      await interaction.editReply('You need to be in a voice channel to change volume!');
      return;
    }

    const musicManager = (interaction.client as any).musicManager as MusicManager;
    const queue = musicManager.getQueue(interaction.guildId!);

    if (!queue || !queue.currentTrack) {
      await interaction.editReply('There is nothing playing right now!');
      return;
    }

    queue.setVolume(volume);
    await interaction.editReply(`Set volume to ${volume}%`);
  }
}
