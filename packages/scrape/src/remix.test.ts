import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseRemixContext,
  loaderDataFromHtml,
  INDEX_ROUTE,
  THEME_ROUTE,
  dataUrl,
} from './remix.ts';

const fixture = (name: string) =>
  readFileSync(join(import.meta.dirname, '__fixtures__', name), 'utf8');

describe('parseRemixContext', () => {
  it('reads the inlined loader data of a theme page', () => {
    const ctx = parseRemixContext(fixture('theme-page.html'));
    expect(Object.keys(ctx.state.loaderData)).toEqual(['root', THEME_ROUTE]);
  });

  it('reads the inlined loader data of an index page', () => {
    const data = loaderDataFromHtml<{
      results: { total: number; extensions: unknown[] };
    }>(fixture('index-page-2.html'), INDEX_ROUTE);
    expect(data.results.total).toBe(15876);
    expect(data.results.extensions).toHaveLength(36);
  });

  it('throws a readable error when the script is missing', () => {
    expect(() => parseRemixContext('<html><body>nope</body></html>')).toThrow(
      /__remixContext/,
    );
  });
});

describe('dataUrl', () => {
  it('asks the index route for its loader json', () => {
    expect(dataUrl('/', INDEX_ROUTE, { page: 3 })).toBe(
      'https://vscodethemes.com/?page=3&_data=routes%2F_index',
    );
  });

  it('asks a theme route for its loader json with sibling pagination', () => {
    expect(
      dataUrl('/e/daylerees.rainglow/absent-contrast-rainglow', THEME_ROUTE, {
        page: 21,
      }),
    ).toBe(
      'https://vscodethemes.com/e/daylerees.rainglow/absent-contrast-rainglow?page=21&_data=routes%2Fe.%24slug.%24theme',
    );
  });
});
