import Redis from 'ioredis';
import { logger } from './logger';

type MemoryEntry = { value: unknown; expiresAt: number };

export class CacheService {
  private memory = new Map<string, MemoryEntry>();
  private redis: Redis | null = null;
  private subscriber: Redis | null = null;
  private invalidationListeners = new Set<(key: string) => void>();
  private readonly channel = 'coupleshub:cache:invalidate';

  constructor(private readonly redisUrl?: string) {}

  async connect(): Promise<void> {
    if (!this.redisUrl) return;
    try {
      this.redis = new Redis(this.redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 2,
        enableOfflineQueue: false,
      });
      await this.redis.connect();
      this.subscriber = this.redis.duplicate();
      await this.subscriber.subscribe(this.channel);
      this.subscriber.on('message', (_channel, key) => {
        this.memory.delete(key);
        for (const listener of this.invalidationListeners) listener(key);
      });
      logger.info('Redis cache connected');
    } catch (error) {
      logger.warn('Redis unavailable; using in-process cache only', error);
      this.redis?.disconnect();
      this.redis = null;
      this.subscriber?.disconnect();
      this.subscriber = null;
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    const local = this.memory.get(key);
    if (local) {
      if (local.expiresAt > Date.now()) return local.value as T;
      this.memory.delete(key);
    }
    if (!this.redis) return undefined;
    try {
      const raw = await this.redis.get(key);
      if (!raw) return undefined;
      const value = JSON.parse(raw) as T;
      this.memory.set(key, { value, expiresAt: Date.now() + 15_000 });
      return value;
    } catch (error) {
      logger.warn(`Redis GET failed for ${key}`, error);
      return undefined;
    }
  }

  async set(key: string, value: unknown, ttlMs = 300_000): Promise<void> {
    this.memory.set(key, { value, expiresAt: Date.now() + Math.min(ttlMs, 60_000) });
    if (!this.redis) return;
    try {
      await this.redis.set(key, JSON.stringify(value), 'PX', ttlMs);
    } catch (error) {
      logger.warn(`Redis SET failed for ${key}`, error);
    }
  }

  async del(key: string): Promise<void> {
    this.memory.delete(key);
    if (this.redis) {
      try {
        await this.redis.del(key);
      } catch (error) {
        logger.warn(`Redis DEL failed for ${key}`, error);
      }
    }
    try {
      await this.redis?.publish(this.channel, key);
    } catch (error) {
      logger.warn('Redis publish failed', error);
    }
  }

  /** Invalidate a prefix without knowing every exact key. */
  async delPrefix(prefix: string): Promise<void> {
    for (const key of this.memory.keys()) {
      if (key.startsWith(prefix)) this.memory.delete(key);
    }
    if (this.redis) {
      try {
        let cursor = '0';
        do {
          const [next, keys] = await this.redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
          cursor = next;
          if (keys.length) await this.redis.del(...keys);
        } while (cursor !== '0');
      } catch (error) {
        logger.warn(`Redis prefix delete failed for ${prefix}`, error);
      }
    }
    try {
      await this.redis?.publish(this.channel, `${prefix}*`);
    } catch {
      // Best effort only.
    }
  }

  onInvalidate(listener: (key: string) => void): () => void {
    this.invalidationListeners.add(listener);
    return () => this.invalidationListeners.delete(listener);
  }

  async close(): Promise<void> {
    await this.subscriber?.quit().catch(() => undefined);
    await this.redis?.quit().catch(() => undefined);
    this.subscriber = null;
    this.redis = null;
    this.memory.clear();
  }
}
