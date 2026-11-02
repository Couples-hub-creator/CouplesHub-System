import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { ConfigStore, type ModuleConfigDefinition } from './config';
import type { CacheService } from './cache';

const definition: ModuleConfigDefinition<{ enabled: boolean; threshold: number }> = {
  moduleId: 'starboard',
  version: 1,
  defaults: { enabled: false, threshold: 3 },
  schema: z.object({ enabled: z.boolean(), threshold: z.number().int().min(1) }),
};

function cacheStub() {
  const values = new Map<string, unknown>();
  return {
    values,
    get: async (key: string) => values.get(key) ?? null,
    set: async (key: string, value: unknown) => {
      values.set(key, value);
    },
    close: async () => undefined,
  } as unknown as CacheService & { values: Map<string, unknown> };
}

test('reading a missing config returns defaults without creating a row', async () => {
  const cache = cacheStub();
  let creates = 0;
  const prisma = {
    moduleConfig: {
      findUnique: async () => null,
      create: async () => {
        creates += 1;
        throw new Error('read must not write');
      },
    },
  };
  const store = new ConfigStore(prisma as never, cache);
  const value = await store.get('123456789012345678', definition);
  assert.deepEqual(value, definition.defaults);
  assert.equal(creates, 0);
  assert.deepEqual(cache.values.get('module-config:123456789012345678:starboard'), definition.defaults);
});

test('saving for a guild without a parent row fails with UNKNOWN_GUILD', async () => {
  const store = new ConfigStore(
    { guild: { findUnique: async () => null } } as never,
    cacheStub(),
  );
  await assert.rejects(
    () => store.set('123456789012345678', definition, { enabled: true, threshold: 5 }),
    (error: unknown) => (error as { code?: string }).code === 'UNKNOWN_GUILD',
  );
});

test('saving upserts the config and writes an audit row in one transaction', async () => {
  const cache = cacheStub();
  let upserts = 0;
  let audits = 0;
  const tx = {
    moduleConfig: {
      upsert: async () => {
        upserts += 1;
        return {};
      },
    },
    configAudit: {
      create: async () => {
        audits += 1;
        return {};
      },
    },
  };
  const prisma = {
    guild: { findUnique: async () => ({ guildId: '123456789012345678' }) },
    moduleConfig: { findUnique: async () => null },
    $transaction: async (run: (client: typeof tx) => Promise<void>) => run(tx),
  };
  const store = new ConfigStore(prisma as never, cache);
  const saved = await store.set('123456789012345678', definition, { enabled: true, threshold: 5 }, { id: '42' });
  assert.deepEqual(saved, { enabled: true, threshold: 5 });
  assert.equal(upserts, 1);
  assert.equal(audits, 1);
  assert.deepEqual(cache.values.get('module-config:123456789012345678:starboard'), {
    enabled: true,
    threshold: 5,
  });
});

test('saving rejects values outside the schema before touching the database', async () => {
  let touched = 0;
  const prisma = {
    guild: {
      findUnique: async () => {
        touched += 1;
        return { guildId: '123456789012345678' };
      },
    },
  };
  const store = new ConfigStore(prisma as never, cacheStub());
  await assert.rejects(() => store.set('123456789012345678', definition, { enabled: true, threshold: 0 }));
  assert.equal(touched, 0);
});
