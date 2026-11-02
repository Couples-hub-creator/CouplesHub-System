import en from '../locales/en.json';
import ar from '../locales/ar.json';
import fr from '../locales/fr.json';

export const locales = ['en', 'ar', 'fr'] as const;
export type Locale = (typeof locales)[number];

type Catalog = Record<string, unknown>;
const catalogs: Record<Locale, Catalog> = { en, ar, fr };

export function resolveLocale(value: string | null | undefined): Locale {
  if (!value) return 'en';
  const base = value.toLowerCase().split(/[-_]/)[0];
  if ((locales as readonly string[]).includes(base)) return base as Locale;
  return 'en';
}

export function isRtl(locale: Locale): boolean {
  return locale === 'ar';
}

export function localeLabel(locale: Locale): string {
  return { en: 'English', ar: 'العربية', fr: 'Français' }[locale];
}

function lookup(catalog: Catalog, key: string): unknown {
  return key.split('.').reduce<unknown>((current, part) => {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[part];
    }
    return undefined;
  }, catalog);
}

export function t(locale: string | null | undefined, key: string, vars: Record<string, string | number> = {}): string {
  const lang = resolveLocale(locale);
  const raw = lookup(catalogs[lang], key) ?? lookup(catalogs.en, key) ?? key;
  let text = typeof raw === 'string' ? raw : key;
  for (const [name, value] of Object.entries(vars)) {
    text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}

export function commandLocalizations(nameKey: string, descriptionKey: string) {
  const name: Record<string, string> = {};
  const description: Record<string, string> = {};
  for (const locale of locales) {
    name[locale] = t(locale, nameKey);
    description[locale] = t(locale, descriptionKey);
  }
  return { name, description };
}

export function allTranslations(key: string): Record<string, string> {
  return Object.fromEntries(locales.map((locale) => [locale, t(locale, key)])) as Record<string, string>;
}

export function formatDuration(ms: number, locale: string | null | undefined = 'en'): string {
  const lang = resolveLocale(locale);
  const units =
    lang === 'ar'
      ? { d: 'ي', h: 'س', m: 'د', s: 'ث' }
      : lang === 'fr'
        ? { d: 'j', h: 'h', m: 'min', s: 's' }
        : { d: 'd', h: 'h', m: 'm', s: 's' };
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}${units.d}`);
  if (hours) parts.push(`${hours}${units.h}`);
  if (minutes) parts.push(`${minutes}${units.m}`);
  if (!days && !hours && !minutes) parts.push(`${seconds}${units.s}`);
  return parts.join(' ');
}
