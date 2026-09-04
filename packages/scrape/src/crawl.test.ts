import { mergeExtensions, themePath, withRanks } from './crawl.ts';
import { PALETTE_FIELDS, type Theme } from '@vscodethemes/shared';

const row = (slug: string, themeSlugs: string[], totalThemes: number) => ({
  slug,
  displayName: slug,
  publisher: 'pub',
  publisherDisplayName: 'Pub',
  totalThemes,
  themeSlugs,
});

describe('mergeExtensions', () => {
  it('collapses repeated index rows of the same extension and unions their theme slugs', () => {
    const merged = mergeExtensions([
      row('a', ['a1', 'a2'], 3),
      row('b', ['b1'], 1),
      row('a', ['a2', 'a3'], 3),
    ]);
    expect(merged).toHaveLength(2);
    expect(merged[0]?.themeSlugs).toEqual(['a1', 'a2', 'a3']);
    expect(merged[0]?.totalThemes).toBe(3);
  });
});

describe('themePath', () => {
  it('builds the site path for a theme', () => {
    expect(
      themePath({ publisher: 'daylerees', slug: 'rainglow' }, 'yule-rainglow'),
    ).toBe('/e/daylerees.rainglow/yule-rainglow');
  });
});

describe('withRanks', () => {
  const palette = Object.fromEntries(
    PALETTE_FIELDS.map((f) => [f, null]),
  ) as Theme['palette'];
  const theme = (publisher: string, slug: string): Theme => ({
    id: `${publisher}.${slug}/t`,
    slug: 't',
    displayName: 't',
    extension: {
      slug,
      displayName: slug,
      publisher,
      publisherDisplayName: publisher,
    },
    palette,
    preview: 'https://images.vscodethemes.com/x.y/t-js-preview-AAAA.svg',
  });

  it('assigns the installs-sorted index position to each theme extension', () => {
    const ranked = withRanks(
      [theme('b', 'two'), theme('a', 'one'), theme('z', 'unknown')],
      [
        { publisher: 'a', slug: 'one' },
        { publisher: 'b', slug: 'two' },
      ],
    );
    expect(ranked.map((t) => t.extension.rank)).toEqual([2, 1, undefined]);
  });
});
