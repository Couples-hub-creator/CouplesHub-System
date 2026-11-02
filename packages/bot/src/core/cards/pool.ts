import { Worker } from 'worker_threads';
import { existsSync } from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { logger } from '../logger';
import { renderCard, renderCardUncached } from './render';
import type { CardSample, CardSpec } from './types';

interface Pending {
  id: number;
  spec: CardSpec;
  sample: CardSample;
  resolve: (buffer: Buffer) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
  worker?: Worker;
}

const cache = new Map<string, Buffer>();

function keyFor(spec: CardSpec, sample: CardSample): string {
  return createHash('sha256').update(JSON.stringify({ spec, sample })).digest('hex');
}

export class CardRenderPool {
  private workers: Array<{ worker: Worker; busy: boolean }> = [];
  private queue: Pending[] = [];
  private nextId = 1;
  private closed = false;
  private directActive = 0;
  private directQueue: Array<() => void> = [];

  constructor(private readonly size = Math.max(0, Number(process.env.CARD_WORKERS ?? 2))) {}

  private workerPath(): { file: string; execArgv?: string[] } | null {
    const js = path.join(__dirname, 'render-worker.js');
    if (existsSync(js)) return { file: js };
    const ts = path.join(__dirname, 'render-worker.ts');
    if (existsSync(ts)) return { file: ts, execArgv: ['--import', 'tsx'] };
    return null;
  }

  private spawn(): { worker: Worker; busy: boolean } | null {
    const target = this.workerPath();
    if (!target) return null;
    const worker = new Worker(target.file, {
      execArgv: target.execArgv,
      env: { ...process.env, CARD_WORKER: '1' },
    });
    const entry = { worker, busy: false };
    worker.on('message', (message: { id: number; ok: boolean; buffer?: Uint8Array; error?: string }) => {
      const pending = this.queue.find((item) => item.id === message.id);
      if (!pending) return;
      this.complete(pending);
      if (message.ok && message.buffer) pending.resolve(Buffer.from(message.buffer));
      else pending.reject(new Error(message.error ?? 'Card worker failed'));
      entry.busy = false;
      this.dispatch();
    });
    worker.on('error', (error) => {
      logger.error('Card worker crashed', error);
      entry.busy = false;
      this.failWorker(entry.worker, error);
    });
    worker.on('exit', (code) => {
      this.workers = this.workers.filter((item) => item.worker !== worker);
      if (!this.closed && code !== 0) {
        logger.warn(`Card worker exited with code ${code}; respawning`);
        this.ensureWorkers();
      }
      this.dispatch();
    });
    worker.unref();
    this.workers.push(entry);
    return entry;
  }

  private ensureWorkers(): void {
    if (this.closed || this.size === 0) return;
    while (this.workers.length < this.size) {
      if (!this.spawn()) break;
    }
  }

  private complete(pending: Pending): void {
    clearTimeout(pending.timer);
    this.queue = this.queue.filter((item) => item.id !== pending.id);
  }

  private failWorker(worker: Worker, error: Error): void {
    for (const pending of this.queue.filter((item) => item.worker === worker)) {
      this.complete(pending);
      pending.reject(error);
    }
    worker.terminate().catch(() => undefined);
    this.workers = this.workers.filter((item) => item.worker !== worker);
  }

  private dispatch(): void {
    if (this.closed) return;
    this.ensureWorkers();
    for (const entry of this.workers) {
      if (entry.busy) continue;
      const pending = this.queue.find((item) => !item.worker);
      if (!pending) break;
      pending.worker = entry.worker;
      entry.busy = true;
      pending.timer = setTimeout(() => {
        this.complete(pending);
        pending.reject(new Error('Card render timed out'));
        entry.busy = false;
        this.failWorker(entry.worker, new Error('Card render timed out'));
        this.dispatch();
      }, 20_000);
      pending.timer.unref?.();
      entry.worker.postMessage({ id: pending.id, spec: pending.spec, sample: pending.sample });
    }
    if (this.queue.some((item) => !item.worker) && this.workers.length === 0) {
      const pending = this.queue.find((item) => !item.worker);
      if (pending) this.runDirect(pending);
    }
  }

  private async runDirect(pending: Pending): Promise<void> {
    if (this.directActive >= 2) {
      await new Promise<void>((resolve) => this.directQueue.push(resolve));
    }
    this.directActive += 1;
    try {
      const buffer = await renderCardUncached(pending.spec, pending.sample);
      this.complete(pending);
      pending.resolve(buffer);
    } catch (error) {
      this.complete(pending);
      try {
        pending.resolve(await renderCard(pending.spec, pending.sample));
      } catch (fallbackError) {
        pending.reject(error instanceof Error ? error : new Error(String(error)));
        logger.error('Card direct render failed', fallbackError);
      }
    } finally {
      this.directActive -= 1;
      this.directQueue.shift()?.();
      this.dispatch();
    }
  }

  async render(spec: CardSpec, sample: CardSample): Promise<Buffer> {
    const key = keyFor(spec, sample);
    const cached = cache.get(key);
    if (cached) return cached;
    this.ensureWorkers();
    const result = await new Promise<Buffer>((resolve, reject) => {
      const pending: Pending = {
        id: this.nextId++,
        spec,
        sample,
        resolve,
        reject,
        timer: setTimeout(() => undefined, 0),
      };
      clearTimeout(pending.timer);
      this.queue.push(pending);
      this.dispatch();
    });
    cache.set(key, result);
    const limit = Math.max(16, Number(process.env.CARD_CACHE_SIZE || 256));
    while (cache.size > limit) {
      const first = cache.keys().next().value;
      if (!first) break;
      cache.delete(first);
    }
    return result;
  }

  async close(): Promise<void> {
    this.closed = true;
    for (const pending of [...this.queue]) {
      this.complete(pending);
      pending.reject(new Error('Card renderer is shutting down'));
    }
    await Promise.all(this.workers.map((entry) => entry.worker.terminate().catch(() => undefined)));
    this.workers = [];
  }
}

let singleton: CardRenderPool | null = null;

export function cardPool(): CardRenderPool {
  if (!singleton) singleton = new CardRenderPool();
  return singleton;
}

export async function renderCardPooled(spec: CardSpec, sample: CardSample): Promise<Buffer> {
  return cardPool().render(spec, sample);
}
