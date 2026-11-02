import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const requireFromHere = createRequire(__filename);
const modulesRoot = path.resolve(__dirname, '../../modules');
const commandsRoot = path.resolve(__dirname, '../../commands');

function moduleFiles(): string[] {
  return fs
    .readdirSync(modulesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(modulesRoot, entry.name, 'module.ts'))
    .filter((file) => fs.existsSync(file));
}

function commandFiles(): string[] {
  return fs
    .readdirSync(commandsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) =>
      fs
        .readdirSync(path.join(commandsRoot, entry.name))
        .filter((file) => /\.(ts|js)$/.test(file) && !file.endsWith('.d.ts') && !file.includes('.test.'))
        .map((file) => path.join(commandsRoot, entry.name, file)),
    );
}

test('module manifests are complete', () => {
  const ids = new Set<string>();
  for (const file of moduleFiles()) {
    const loaded = requireFromHere(file);
    const module = loaded.default ?? loaded;
    assert.ok(module.manifest, `${file} is missing a manifest`);
    assert.ok(module.manifest.id, `${file} is missing an id`);
    assert.ok(!ids.has(module.manifest.id), `duplicate module id: ${module.manifest.id}`);
    ids.add(module.manifest.id);
    assert.ok(module.manifest.name.length > 0, `${module.manifest.id} is missing a name`);
    assert.ok(module.manifest.description.length > 0, `${module.manifest.id} is missing a description`);
    assert.ok(Array.isArray(module.manifest.requiredIntents), `${module.manifest.id} requiredIntents is invalid`);
    assert.ok(Array.isArray(module.manifest.requiredPermissions), `${module.manifest.id} requiredPermissions is invalid`);
    assert.ok(module.manifest.ui?.sections?.length, `${module.manifest.id} has no dashboard UI`);
  }
  assert.ok(ids.size >= 20, `only ${ids.size} modules discovered`);
});

test('slash command names are unique and fit the Discord budget', () => {
  const names = new Map<string, string>();
  for (const file of commandFiles()) {
    const loaded = requireFromHere(file);
    const CommandClass = loaded.default;
    if (!CommandClass) continue;
    const command = new CommandClass();
    const name = command.data?.name;
    assert.ok(name, `${file} has no command name`);
    assert.ok(!names.has(name), `duplicate command /${name} in ${file} and ${names.get(name)}`);
    names.set(name, file);
  }
  for (const file of moduleFiles()) {
    const loaded = requireFromHere(file);
    const module = loaded.default ?? loaded;
    for (const CommandClass of module.commands ?? []) {
      const command = new CommandClass();
      const name = command.data?.name;
      assert.ok(name, `${file} has a command without data.name`);
      assert.ok(!names.has(name), `duplicate command /${name} in ${file} and ${names.get(name)}`);
      names.set(name, file);
      const payload = JSON.stringify(command.data.toJSON());
      assert.ok(Buffer.byteLength(payload, 'utf8') < 8_000, `/${name} payload is too large`);
    }
  }
  assert.ok(names.size <= 100, `${names.size} top-level commands exceeds Discord's 100 command limit`);
});
