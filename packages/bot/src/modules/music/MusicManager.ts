import { BotClient } from '../../structures/BotClient';
import { VoiceBasedChannel, TextChannel } from 'discord.js';
import { Player } from 'shoukaku';
import { logger } from '../../utils/logger';

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
      shardId: 0,
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
    this.volume = Math.max(0, Math.min(100, volume));
    if (this.player) {
      this.player.setGlobalVolume(this.volume);
    }
  }

  public seek(position: number): void {
    if (this.player && this.currentTrack) {
      this.player.seekTo(position * 1000);
    }
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
