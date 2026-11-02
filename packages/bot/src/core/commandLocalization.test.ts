import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  applyCommandLocalizations,
  commandLocalizationCatalogs,
  commandPayloadPaths,
  commandPayloadSize,
  LOCALIZED_COMMAND_LOCALES,
  MAX_COMMAND_PAYLOAD_BYTES,
  type LocalizableCommandPayload,
} from './commandLocalization';

const requireFromHere = createRequire(__filename);
const modulesRoot = path.resolve(__dirname, '../modules');
const commandsRoot = path.resolve(__dirname, '../commands');
const SAFE = MAX_COMMAND_PAYLOAD_BYTES - 200;

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

type LocalizedPayload = LocalizableCommandPayload & {
  name_localizations?: Record<string, string>;
  description_localizations?: Record<string, string>;
  options?: LocalizedPayload[];
};

function payloads(): LocalizedPayload[] {
  const collected: LocalizedPayload[] = [];
  for (const file of commandFiles()) {
    const CommandClass = requireFromHere(file).default;
    if (!CommandClass) continue;
    collected.push(new CommandClass().toJSON() as LocalizedPayload);
  }
  for (const file of moduleFiles()) {
    const loaded = requireFromHere(file);
    const module = loaded.default ?? loaded;
    for (const CommandClass of module.commands ?? []) {
      collected.push(new CommandClass().toJSON() as LocalizedPayload);
    }
  }
  return collected;
}

const all = payloads();

test('every slash command has EN/AR/FR catalog entries', () => {
  const covered = new Set<string>();
  for (const payload of all) {
    for (const pathKey of commandPayloadPaths(payload)) {
      covered.add(pathKey);
      for (const locale of LOCALIZED_COMMAND_LOCALES) {
        const entry = commandLocalizationCatalogs[locale][pathKey];
        assert.ok(entry?.name, `${locale} is missing the name for ${pathKey}`);
        assert.ok(entry?.description, `${locale} is missing the description for ${pathKey}`);
      }
    }
  }
  for (const locale of LOCALIZED_COMMAND_LOCALES) {
    const orphans = Object.keys(commandLocalizationCatalogs[locale]).filter((key) => !covered.has(key));
    assert.deepEqual(orphans, [], `${locale} catalog has keys that match no command: ${orphans.join(', ')}`);
  }
});

test('registered payloads apply the catalog and stay inside the 8000-byte limit', () => {
  for (const payload of all) {
    for (const locale of LOCALIZED_COMMAND_LOCALES) {
      assert.equal(
        payload.name_localizations?.[locale],
        commandLocalizationCatalogs[locale][payload.name]?.name,
        `/${payload.name} is missing the ${locale} name`,
      );
      assert.equal(
        payload.description_localizations?.[locale],
        commandLocalizationCatalogs[locale][payload.name]?.description,
        `/${payload.name} is missing the ${locale} description`,
      );
    }

    const size = commandPayloadSize(payload);
    assert.ok(size <= MAX_COMMAND_PAYLOAD_BYTES, `/${payload.name} payload is ${size} bytes`);

    const full = applyCommandLocalizations(payload);
    if (commandPayloadSize(full) <= SAFE) {
      assert.deepEqual(payload, full, `/${payload.name} was degraded even though the full payload fits`);
    }
  }
});

test('localized payloads respect Discord name and description limits', () => {
  const canonical = new Set<string>();
  const localizedTopLevel = new Map<string, string>();

  const check = (payload: LocalizedPayload) => {
    if (payload.name_localizations) {
      for (const [locale, value] of Object.entries(payload.name_localizations)) {
        assert.ok(value.length >= 1 && value.length <= 32, `${payload.name} (${locale}) name is ${value.length} chars`);
        assert.match(value, /^[^\s]+$/u, `${payload.name} (${locale}) name has whitespace`);
        assert.equal(value, value.toLowerCase(), `${payload.name} (${locale}) name must be lowercase`);
      }
    }
    if (payload.description_localizations) {
      for (const [locale, value] of Object.entries(payload.description_localizations)) {
        assert.ok(
          value.length >= 1 && value.length <= 100,
          `${payload.name} (${locale}) description is ${value.length} chars`,
        );
      }
    }
    for (const option of payload.options ?? []) check(option);
  };

  for (const payload of all) {
    assert.ok(!canonical.has(payload.name), `duplicate canonical command /${payload.name}`);
    canonical.add(payload.name);
    check(payload);
    for (const locale of LOCALIZED_COMMAND_LOCALES) {
      const localized = payload.name_localizations?.[locale];
      if (!localized) continue;
      const key = `${locale}:${localized}`;
      const owner = localizedTopLevel.get(key);
      assert.equal(owner, undefined, `${locale} name "${localized}" is used by /${owner} and /${payload.name}`);
      localizedTopLevel.set(key, payload.name);
    }
  }
});
