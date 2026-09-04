import {
  PALETTE_FIELDS,
  themeId,
  type Hex,
  type Palette,
  type Theme,
  type ThemeExtension,
} from '@vscodethemes/shared';

interface RawThemeSummary {
  name: string;
  displayName: string;
  url: string;
}

export type RawThemeRecord = RawThemeSummary &
  Partial<Record<(typeof PALETTE_FIELDS)[number], string | null>>;

interface RawExtension {
  name: string;
  displayName: string;
  publisherName: string;
  publisherDisplayName: string;
  themes: RawThemeSummary[];
  totalThemes: number;
  theme: RawThemeRecord | null;
}

interface RawResults {
  results: { total: number; extensions: RawExtension[] };
}

export interface IndexedExtension extends ThemeExtension {
  totalThemes: number;
  themeSlugs: string[];
}

export interface IndexPage {
  total: number;
  extensions: IndexedExtension[];
}

export interface ThemePage {
  extension: ThemeExtension;
  theme: RawThemeRecord & { slug: string };
  siblingSlugs: string[];
  totalThemes: number;
}

function toExtension(raw: RawExtension): ThemeExtension {
  return {
    slug: raw.name,
    displayName: raw.displayName,
    publisher: raw.publisherName,
    publisherDisplayName: raw.publisherDisplayName,
  };
}

export function parseIndexPage(data: unknown): IndexPage {
  const { results } = data as RawResults;
  return {
    total: results.total,
    extensions: results.extensions.map((raw) => ({
      ...toExtension(raw),
      totalThemes: raw.totalThemes,
      themeSlugs: raw.themes.map((t) => t.name),
    })),
  };
}

export function parseThemePage(data: unknown): ThemePage {
  const raw = (data as RawResults).results.extensions[0];
  if (!raw?.theme) {
    throw new Error('theme page without a theme record');
  }
  return {
    extension: toExtension(raw),
    theme: { ...raw.theme, slug: raw.theme.name },
    siblingSlugs: raw.themes.map((t) => t.name),
    totalThemes: raw.totalThemes,
  };
}

function normalizeHex(value: string | null | undefined): Hex | null {
  if (!value) return null;
  return value.toLowerCase() as Hex;
}

export function toTheme(
  extension: ThemeExtension,
  record: RawThemeRecord,
): Theme {
  const palette = Object.fromEntries(
    PALETTE_FIELDS.map((field) => [field, normalizeHex(record[field])]),
  ) as Palette;
  return {
    id: themeId(extension.publisher, extension.slug, record.name),
    slug: record.name,
    displayName: record.displayName,
    extension,
    palette,
    preview: record.url,
  };
}
