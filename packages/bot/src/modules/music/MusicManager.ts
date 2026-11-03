import { BotClient } from '../../structures/BotClient';
import { VoiceBasedChannel, TextChannel } from 'discord.js';
import { Player } from 'shoukaku';
import { logger } from '../../utils/logger';

export const FILTERS: Record<string, string> = {
  bassboost: 'Bass boost',
  nightcore: 'Nightcore',
  vaporwave: 'Vaporwave',
  slowmode: 'Slowed',
  '8d': '8D audio',
  karaoke: 'Karaoke',
  tremolo: 'Tremolo',
  vibrato: 'Vibrato',
  distortion: 'Distortion',
  lowpass: 'Low pass',
};

export interface Track {
  encoded: string;
  info: {
    title: string;
    author: string;
    length: number;
    identifier: string;
    isSeekable: boolean;
    isStream: boolean;
    uri: string;
    artworkUrl?: string;
    sourceName?: string;
  };
  pluginInfo?: any;
}

export class MusicManager {
  private client: BotClient;
  private queues: Map<string, Queue>;

  constructor(client: BotClient) {
    this.client = client;
    this.queues = new Map();
  }

  public getQueue(guildId: string): Queue | undefined {
    return this.queues.get(guildId);
  }

  public createQueue(guildId: string, textChannel: TextChannel, voiceChannel: VoiceBasedChannel): Queue {
    const queue = new Queue(this.client, guildId, textChannel, voiceChannel);
    this.queues.set(guildId, queue);
    return queue;
  }

  public deleteQueue(guildId: string): void {
    const queue = this.queues.get(guildId);
    if (queue) {
      queue.destroy();
      this.queues.delete(guildId);
    }
  }
}

export class Queue {
  public tracks: Track[] = [];
  public currentTrack: Track | null = null;
  public previousTrack: Track | null = null;
  public player: Player | null = null;
  public volume: number = 100;
  public loop: 'off' | 'track' | 'queue' = 'off';
  public shuffle: boolean = false;
  public paused: boolean = false;
  public filters: string[] = [];
  public muted: boolean = false;
  public textChannel: TextChannel;
  public voiceChannel: VoiceBasedChannel;
  public guildId: string;
  public lastMessage: any = null;
  private client: BotClient;

  constructor(
    client: BotClient,
    guildId: string,
    textChannel: TextChannel,
    voiceChannel: VoiceBasedChannel
  ) {
    this.client = client;
    this.guildId = guildId;
    this.textChannel = textChannel;
    this.voiceChannel = voiceChannel;
  }

  public async connect(): Promise<Player> {
    const player = await this.client.shoukaku.joinVoiceChannel({
      guildId: this.guildId,
      channelId: this.voiceChannel.id,
      shardId: this.voiceChannel.guild.shardId,
    });

    this.player = player;

    player.on('start', () => {
      logger.info(`Started playing: ${this.currentTrack?.info.title}`);
    });

    player.on('end', () => {
      this.handleTrackEnd();
    });

    player.on('closed', () => {
      this.destroy();
    });

    player.on('exception', (error: any) => {
      logger.error('Player error:', error);
    });

    return player;
  }

  public addTrack(track: Track): void {
    this.tracks.push(track);
  }

  public addTracks(tracks: Track[]): void {
    this.tracks.push(...tracks);
  }

  public async play(): Promise<void> {
    if (!this.player) {
      await this.connect();
    }

    if (this.paused) {
      this.player?.setPaused(false);
      this.paused = false;
      return;
    }

    if (this.tracks.length === 0) {
      if (this.currentTrack) {
        this.currentTrack = null;
        this.destroy();
      }
      return;
    }

    if (this.loop === 'track' && this.currentTrack) {
      this.player?.playTrack({ track: { encoded: this.currentTrack.encoded } });
      return;
    }

    if (this.shuffle) {
      this.shuffleQueue();
    }

    this.previousTrack = this.currentTrack;
    this.currentTrack = this.tracks.shift() || null;

    if (this.currentTrack) {
      this.player?.playTrack({ track: { encoded: this.currentTrack.encoded } });
    }
  }

  public pause(): void {
    if (this.player) {
      this.player.setPaused(true);
      this.paused = true;
    }
  }

  public resume(): void {
    if (this.player) {
      this.player.setPaused(false);
      this.paused = false;
    }
  }

  public skip(): void {
    if (this.player) {
      this.player.stopTrack();
    }
  }

  public playPrevious(): void {
    if (this.previousTrack) {
      this.tracks.unshift(this.currentTrack!);
      this.currentTrack = this.previousTrack;
      this.previousTrack = null;
      this.player?.playTrack({ track: { encoded: this.currentTrack.encoded } });
    }
  }

  public stop(): void {
    this.tracks = [];
    this.currentTrack = null;
    this.previousTrack = null;
    if (this.player) {
      this.player.stopTrack();
      this.client.shoukaku.leaveVoiceChannel(this.guildId);
    }
    this.destroy();
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(200, Math.floor(volume)));
    if (this.player) {
      void this.player.setGlobalVolume(this.volume);
    }
  }

  public seek(position: number): void {
    if (this.player && this.currentTrack) {
      void this.player.seekTo(position * 1000);
    }
  }

  public async toggleFilter(name: string, enabled: boolean): Promise<string[]> {
    const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!FILTERS[normalized]) throw new Error(`Unknown filter: ${name}`);
    this.filters = enabled
      ? Array.from(new Set([...this.filters, normalized]))
      : this.filters.filter((item) => item !== normalized);
    if (this.player) await this.player.setFilters(this.filterOptions());
    return [...this.filters];
  }

  private filterOptions(): Record<string, unknown> {
    const options: Record<string, unknown> = { volume: this.volume / 100 };
    if (this.filters.includes('bassboost')) {
      options.equalizer = [
        { band: 0, gain: 0.6 },
        { band: 1, gain: 0.45 },
        { band: 2, gain: 0.3 },
      ];
    }
    if (this.filters.includes('nightcore')) options.timescale = { speed: 1.2, pitch: 1.2, rate: 1 };
    if (this.filters.includes('vaporwave')) options.timescale = { speed: 0.8, pitch: 0.8, rate: 1 };
    if (this.filters.includes('slowmode')) options.timescale = { speed: 0.7, pitch: 1, rate: 0.7 };
    if (this.filters.includes('8d')) options.rotation = { rotationHz: 0.2 };
    if (this.filters.includes('karaoke')) options.karaoke = { level: 1, monoLevel: 1, filterBand: 220, filterWidth: 100 };
    if (this.filters.includes('tremolo')) options.tremolo = { frequency: 4, depth: 0.75 };
    if (this.filters.includes('vibrato')) options.vibrato = { frequency: 4, depth: 0.75 };
    if (this.filters.includes('distortion')) {
      options.distortion = { sinOffset: 0, sinScale: 1, cosOffset: 0, cosScale: 1, tanOffset: 0, tanScale: 1, offset: 0, scale: 1 };
    }
    if (this.filters.includes('lowpass')) options.lowPass = { smoothing: 20 };
    return options;
  }

  public setLoop(mode: 'off' | 'track' | 'queue'): void {
    this.loop = mode;
  }

  public setShuffle(enabled: boolean): void {
    this.shuffle = enabled;
  }

  public removeTrack(index: number): Track | undefined {
    if (index >= 0 && index < this.tracks.length) {
      return this.tracks.splice(index, 1)[0];
    }
    return undefined;
  }

  public moveTrack(fromIndex: number, toIndex: number): void {
    if (fromIndex >= 0 && fromIndex < this.tracks.length && toIndex >= 0 && toIndex < this.tracks.length) {
      const [track] = this.tracks.splice(fromIndex, 1);
      this.tracks.splice(toIndex, 0, track);
    }
  }

  public clearQueue(): void {
    this.tracks = [];
  }

  private shuffleQueue(): void {
    for (let i = this.tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
    }
  }

  private handleTrackEnd(): void {
    if (this.loop === 'track' && this.currentTrack) {
      this.player?.playTrack({ track: { encoded: this.currentTrack.encoded } });
    } else if (this.loop === 'queue' && this.currentTrack) {
      this.tracks.push(this.currentTrack);
      this.play();
    } else {
      this.play();
    }
  }

  public destroy(): void {
    if (this.player) {
      this.client.shoukaku.leaveVoiceChannel(this.guildId);
      this.player = null;
    }
    this.currentTrack = null;
    this.previousTrack = null;
    this.tracks = [];
  }
}
