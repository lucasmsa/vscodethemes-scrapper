import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PALETTE_FIELDS } from '@vscodethemes/shared';
import { parseIndexPage, parseThemePage, toTheme } from './parse.ts';

const json = (name: string) =>
  JSON.parse(
    readFileSync(join(import.meta.dirname, '__fixtures__', name), 'utf8'),
  );

describe('parseIndexPage', () => {
  it('lists extensions with their visible theme slugs and total count', () => {
    const page = parseIndexPage(json('index-page-1.json'));
    expect(page.total).toBe(15876);
    expect(page.extensions).toHaveLength(36);
    const cpp = page.extensions.find((e) => e.slug === 'cpptools-themes');
    expect(cpp).toMatchObject({
      publisher: 'ms-vscode',
      publisherDisplayName: 'Microsoft',
      displayName: 'C/C++ Themes',
      totalThemes: 4,
    });
    expect(cpp?.themeSlugs).toEqual([
      '2017-dark-visual-studio-c-c',
      '2017-light-visual-studio-c-c',
      'dark-visual-studio-c-c',
      'light-visual-studio-c-c',
    ]);
  });

  it('reports an empty page past the end', () => {
    const page = parseIndexPage({ results: { total: 15876, extensions: [] } });
    expect(page.extensions).toEqual([]);
  });
});

describe('parseThemePage', () => {
  it('returns the full palette of the requested theme and its sibling slugs', () => {
    const page = parseThemePage(json('theme-siblings-page-21.json'));
    expect(page.theme.slug).toBe('absent-contrast-rainglow');
    expect(page.siblingSlugs).toHaveLength(4);
    expect(page.siblingSlugs[0]).toBe('yule-rainglow');
    expect(page.totalThemes).toBe(325);
  });

  it('returns no siblings past the last page', () => {
    expect(
      parseThemePage(json('theme-siblings-page-22.json')).siblingSlugs,
    ).toEqual([]);
  });
});

describe('toTheme', () => {
  it('normalizes a theme record into the shared Theme contract', () => {
    const page = parseThemePage(json('theme-siblings-page-21.json'));
    const theme = toTheme(page.extension, page.theme);
    expect(theme.id).toBe('daylerees.rainglow/absent-contrast-rainglow');
    expect(theme.extension).toEqual({
      slug: 'rainglow',
      displayName: 'Rainglow',
      publisher: 'daylerees',
      publisherDisplayName: 'Dayle Rees',
    });
    expect(Object.keys(theme.palette)).toEqual([...PALETTE_FIELDS]);
    expect(theme.palette.editorBackground).toMatch(/^#[0-9a-f]{6}$/);
    expect(theme.preview).toMatch(/-js-preview-/);
  });

  it('lowercases hex and keeps missing colors as null', () => {
    const theme = toTheme(
      {
        slug: 'x',
        displayName: 'X',
        publisher: 'p',
        publisherDisplayName: 'P',
      },
      {
        name: 't',
        displayName: 'T',
        url: 'https://images.vscodethemes.com/p.x/t-js-preview-AAAA.svg',
        editorBackground: '#ABCDEF',
        statusBarBackground: null,
      },
    );
    expect(theme.palette.editorBackground).toBe('#abcdef');
    expect(theme.palette.statusBarBackground).toBeNull();
    expect(theme.palette.tabBorder).toBeNull();
  });
});
