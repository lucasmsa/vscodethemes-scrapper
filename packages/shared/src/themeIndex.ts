import {
  PALETTE_FIELDS,
  type Hex,
  type Palette,
  type PaletteField,
} from './palette.ts';
import type { Theme } from './theme.ts';
import { paletteClasses } from './classes.ts';

/** The palette fields the identifier page needs: what the matcher samples and what the re-theme paints. */
export const INDEX_FIELDS = [
  'editorBackground',
  'editorForeground',
  'activityBarBackground',
  'activityBarForeground',
  'activityBarBadgeBackground',
  'activityBarActiveBorder',
  'tabsContainerBackground',
  'tabActiveBorderTop',
  'statusBarBackground',
  'statusBarForeground',
  'titleBarActiveBackground',
  'titleBarActiveForeground',
] as const satisfies readonly PaletteField[];

export type IndexField = (typeof INDEX_FIELDS)[number];

/** Columnar so gzip sees long runs of repeated hex values; one position per theme in every array. */
export interface ThemeIndex {
  version: 2;
  fields: readonly IndexField[];
  ids: string[];
  names: string[];
  extensions: string[];
  previewHashes: string[];
  /** Installs rank of the theme's extension, 0 when unknown. */
  ranks: number[];
  /** Palette class per theme: themes with identical 24-color palettes share a class. */
  classes: number[];
  colors: Record<IndexField, Array<string | null>>;
}

export interface IndexedTheme {
  id: string;
  displayName: string;
  extensionDisplayName: string;
  preview: string;
  rank: number;
  paletteClass: number;
  palette: Palette;
}

const PREVIEW_HOST = 'https://images.vscodethemes.com/';
const HASH_PATTERN = /^.*-js-preview-([A-Za-z0-9_-]+)\.svg$/;

export function previewHash(preview: string): string {
  const match = HASH_PATTERN.exec(preview);
  if (!match?.[1]) throw new Error(`unexpected preview url ${preview}`);
  return match[1];
}

export function previewFromHash(id: string, hash: string): string {
  return `${PREVIEW_HOST}${id}-js-preview-${hash}.svg`;
}

const stripHash = (hex: Hex | null) => (hex ? hex.slice(1) : null);

export function buildThemeIndex(themes: Theme[]): ThemeIndex {
  const colors = Object.fromEntries(
    INDEX_FIELDS.map((field) => [field, [] as Array<string | null>]),
  ) as ThemeIndex['colors'];
  const index: ThemeIndex = {
    version: 2,
    fields: INDEX_FIELDS,
    ids: [],
    names: [],
    extensions: [],
    previewHashes: [],
    ranks: [],
    classes: paletteClasses(themes.map((t) => t.palette)).classOf,
    colors,
  };
  for (const theme of themes) {
    index.ids.push(theme.id);
    index.names.push(theme.displayName);
    index.extensions.push(theme.extension.displayName);
    index.previewHashes.push(previewHash(theme.preview));
    index.ranks.push(theme.extension.rank ?? 0);
    for (const field of INDEX_FIELDS)
      colors[field].push(stripHash(theme.palette[field]));
  }
  return index;
}

const emptyPalette = (): Palette =>
  Object.fromEntries(PALETTE_FIELDS.map((f) => [f, null])) as Palette;

export function expandThemeIndex(index: ThemeIndex): IndexedTheme[] {
  return index.ids.map((id, i) => {
    const palette = emptyPalette();
    for (const field of index.fields) {
      const value = index.colors[field][i];
      palette[field] = value ? (`#${value}` as Hex) : null;
    }
    return {
      id,
      displayName: index.names[i]!,
      extensionDisplayName: index.extensions[i]!,
      preview: previewFromHash(id, index.previewHashes[i]!),
      rank: index.ranks[i] ?? 0,
      paletteClass: index.classes[i] ?? i,
      palette,
    };
  });
}
