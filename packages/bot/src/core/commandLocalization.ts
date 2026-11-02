import ar from '../locales/commands.ar.json';
import fr from '../locales/commands.fr.json';

/**
 * Slash command localization catalog.
 *
 * Keys are dotted paths: the command name, then each option/subcommand name.
 * Example: `case.undo.confirm`. The canonical English payload stays untouched,
 * so `interaction.commandName` and `interaction.options.get()` keep working
 * while Discord shows the translated labels to matching clients.
 */
export type CommandLocalizationEntry = { name?: string; description?: string };
export type CommandLocalizationCatalog = Record<string, CommandLocalizationEntry>;

export const commandLocalizationCatalogs: Record<'ar' | 'fr', CommandLocalizationCatalog> = {
  ar: ar as CommandLocalizationCatalog,
  fr: fr as CommandLocalizationCatalog,
};

export const LOCALIZED_COMMAND_LOCALES = Object.keys(commandLocalizationCatalogs) as Array<'ar' | 'fr'>;

/** Discord rejects a single application command payload above 8000 bytes. */
export const MAX_COMMAND_PAYLOAD_BYTES = 8_000;
/** Keep a little headroom so the guard itself can never trip the API. */
const SAFE_COMMAND_PAYLOAD_BYTES = 7_800;

const NAME_LIMIT = 32;
const DESCRIPTION_LIMIT = 100;

export interface LocalizableOption {
  name: string;
  description?: string;
  options?: LocalizableOption[];
  name_localizations?: Record<string, string>;
  description_localizations?: Record<string, string>;
}

export interface LocalizableCommandPayload extends LocalizableOption {
  description: string;
}

function validName(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 1 && value.length <= NAME_LIMIT && !/\s/.test(value);
}

function validDescription(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 1 && value.length <= DESCRIPTION_LIMIT;
}

function merge(
  target: Record<string, string> | undefined,
  locale: string,
  value: string | undefined,
): Record<string, string> | undefined {
  if (!value) return target;
  return { ...(target ?? {}), [locale]: value };
}

function apply(
  payload: LocalizableOption,
  pathPrefix: string,
  catalog: CommandLocalizationCatalog,
  locale: 'ar' | 'fr',
): void {
  const entry = catalog[pathPrefix];
  if (entry) {
    if (validName(entry.name)) {
      payload.name_localizations = merge(payload.name_localizations, locale, entry.name);
    }
    if (validDescription(entry.description)) {
      payload.description_localizations = merge(payload.description_localizations, locale, entry.description);
    }
  }
  for (const option of payload.options ?? []) {
    apply(option, `${pathPrefix}.${option.name}`, catalog, locale);
  }
}

/** Applies every catalog entry, without any size guard. Used by tests and docs. */
export function applyCommandLocalizations<T extends LocalizableCommandPayload>(payload: T): T {
  const localized = JSON.parse(JSON.stringify(payload)) as T;
  for (const [locale, catalog] of Object.entries(commandLocalizationCatalogs)) {
    apply(localized, localized.name, catalog, locale as 'ar' | 'fr');
  }
  return localized;
}

export function commandPayloadSize(payload: unknown): number {
  return Buffer.byteLength(JSON.stringify(payload), 'utf8');
}

function stripDescriptions(options: LocalizableOption[] | undefined): void {
  for (const option of options ?? []) {
    delete option.description_localizations;
    stripDescriptions(option.options);
  }
}

function stripNames(options: LocalizableOption[] | undefined): void {
  for (const option of options ?? []) {
    delete option.name_localizations;
    stripNames(option.options);
  }
}

/**
 * Returns a new payload with `name_localizations` / `description_localizations`
 * applied to the command and every nested option.
 *
 * Discord caps a command payload at 8000 bytes. `/automod` alone can cross that
 * once two locales are attached, so the guard degrades deterministically:
 * full localization, then option names only, then top-level only. The command
 * itself is always localized and the payload always fits.
 */
export function localizeCommandPayload<T extends LocalizableCommandPayload>(payload: T): T {
  const localized = applyCommandLocalizations(payload);
  if (commandPayloadSize(localized) <= SAFE_COMMAND_PAYLOAD_BYTES) return localized;
  stripDescriptions(localized.options);
  if (commandPayloadSize(localized) <= SAFE_COMMAND_PAYLOAD_BYTES) return localized;
  stripNames(localized.options);
  return localized;
}

/** Flattens a command payload into the same dotted keys used by the catalog. */
export function commandPayloadPaths(payload: LocalizableCommandPayload): string[] {
  const paths: string[] = [payload.name];
  const walk = (options: LocalizableOption[] | undefined, prefix: string) => {
    for (const option of options ?? []) {
      const path = `${prefix}.${option.name}`;
      paths.push(path);
      walk(option.options, path);
    }
  };
  walk(payload.options, payload.name);
  return paths;
}
