import { PALETTE_FIELDS } from './palette.ts';
import type { Theme } from './theme.ts';
import {
  INDEX_FIELDS,
  buildThemeIndex,
  expandThemeIndex,
  previewFromHash,
  previewHash,
} from './themeIndex.ts';

const palette = Object.fromEntries(
  PALETTE_FIELDS.map((f) => [f, null]),
) as Theme['palette'];
const theme: Theme = {
  id: 'dracula-theme.theme-dracula/dracula-theme',
  slug: 'dracula-theme',
  displayName: 'Dracula Theme',
  extension: {
    slug: 'theme-dracula',
    displayName: 'Dracula Theme Official',
    publisher: 'dracula-theme',
    publisherDisplayName: 'Dracula Theme',
    rank: 5,
  },
  palette: {
    ...palette,
    editorBackground: '#282a36',
    statusBarBackground: '#191a21',
    tabBorder: '#191a21',
  },
  preview:
    'https://images.vscodethemes.com/dracula-theme.theme-dracula/dracula-theme-js-preview-DjUf.svg',
};

describe('theme index', () => {
  it('stores columns with one entry per theme and colors without the hash sign', () => {
    const index = buildThemeIndex([theme]);
    expect(index.fields).toEqual(INDEX_FIELDS);
    expect(index.ids).toEqual([theme.id]);
    expect(index.names).toEqual(['Dracula Theme']);
    expect(index.extensions).toEqual(['Dracula Theme Official']);
    expect(index.previewHashes).toEqual(['DjUf']);
    expect(index.ranks).toEqual([5]);
    expect(index.classes).toEqual([0]);
    expect(index.colors.editorBackground).toEqual(['282a36']);
    expect(index.colors.statusBarBackground).toEqual(['191a21']);
    expect(index.colors.editorForeground).toEqual([null]);
  });

  it('expands back to a full palette and the js preview url', () => {
    const [expanded] = expandThemeIndex(buildThemeIndex([theme]));
    expect(expanded?.palette.editorBackground).toBe('#282a36');
    expect(expanded?.palette.statusBarBackground).toBe('#191a21');
    expect(expanded?.palette.tabBorder).toBeNull();
    expect(expanded?.preview).toBe(theme.preview);
    expect(expanded?.rank).toBe(5);
    expect(expanded?.paletteClass).toBe(0);
    expect(Object.keys(expanded!.palette)).toEqual([...PALETTE_FIELDS]);
  });

  it('round-trips the preview hash', () => {
    expect(previewHash(theme.preview)).toBe('DjUf');
    expect(previewFromHash(theme.id, 'DjUf')).toBe(theme.preview);
    expect(() => previewHash('https://example.com/x.png')).toThrow(
      /unexpected preview url/,
    );
  });
});
