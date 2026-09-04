import type { Theme } from '@vscodethemes/shared';
import type { Http } from './http.ts';
import {
  INDEX_ROUTE,
  THEME_ROUTE,
  dataUrl,
  loaderDataFromHtml,
} from './remix.ts';
import {
  parseIndexPage,
  parseThemePage,
  toTheme,
  type IndexedExtension,
} from './parse.ts';
import type { ThemeCache } from './cache.ts';

export const THEMES_PER_SIBLING_PAGE = 16;

export interface CrawlEvents {
  onIndexPage?(page: number, extensions: number, total: number): void;
  onThemesDiscovered?(count: number): void;
  onTheme?(theme: Theme): void;
  onError?(context: string, error: unknown): void;
}

async function loader<T>(
  http: Http,
  path: string,
  route: string,
  params: Record<string, number> = {},
): Promise<T> {
  try {
    return await http.json<T>(dataUrl(path, route, params));
  } catch {
    const url = new URL(path, 'https://vscodethemes.com');
    for (const [k, v] of Object.entries(params))
      url.searchParams.set(k, String(v));
    return loaderDataFromHtml<T>(await http.text(url.toString()), route);
  }
}

/** The index lists one row per theme, so an extension with n visible themes shows up n times. */
export function mergeExtensions(rows: IndexedExtension[]): IndexedExtension[] {
  const merged = new Map<string, IndexedExtension>();
  for (const row of rows) {
    const key = `${row.publisher}.${row.slug}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...row, themeSlugs: [...row.themeSlugs] });
      continue;
    }
    for (const slug of row.themeSlugs)
      if (!existing.themeSlugs.includes(slug)) existing.themeSlugs.push(slug);
    existing.totalThemes = Math.max(existing.totalThemes, row.totalThemes);
  }
  return [...merged.values()];
}

export async function crawlIndex(
  http: Http,
  events: CrawlEvents = {},
): Promise<IndexedExtension[]> {
  const rows: IndexedExtension[] = [];
  for (let page = 1; ; page++) {
    const parsed = parseIndexPage(
      await loader(http, '/', INDEX_ROUTE, { page }),
    );
    events.onIndexPage?.(page, parsed.extensions.length, parsed.total);
    if (parsed.extensions.length === 0) break;
    rows.push(...parsed.extensions);
  }
  return mergeExtensions(rows);
}

export function themePath(
  extension: { publisher: string; slug: string },
  themeSlug: string,
): string {
  return `/e/${extension.publisher}.${extension.slug}/${themeSlug}`;
}

export async function discoverThemeSlugs(
  http: Http,
  extension: IndexedExtension,
): Promise<string[]> {
  const slugs = new Set(extension.themeSlugs);
  const anchor = extension.themeSlugs[0];
  if (!anchor || slugs.size >= extension.totalThemes) return [...slugs];
  const pages = Math.ceil(extension.totalThemes / THEMES_PER_SIBLING_PAGE);
  const results = await Promise.all(
    Array.from({ length: pages }, (_, i) =>
      loader(http, themePath(extension, anchor), THEME_ROUTE, {
        page: i + 1,
      }).then(parseThemePage),
    ),
  );
  for (const page of results) {
    slugs.add(page.theme.slug);
    for (const slug of page.siblingSlugs) slugs.add(slug);
  }
  return [...slugs];
}

export async function fetchTheme(
  http: Http,
  extension: IndexedExtension,
  themeSlug: string,
): Promise<Theme> {
  const page = parseThemePage(
    await loader(http, themePath(extension, themeSlug), THEME_ROUTE),
  );
  return toTheme(page.extension, page.theme);
}

export async function crawlThemes(
  http: Http,
  cache: ThemeCache,
  events: CrawlEvents = {},
): Promise<Theme[]> {
  const extensions = await crawlIndex(http, events);
  const targets = new Map<
    string,
    { extension: IndexedExtension; slug: string }
  >();
  await Promise.all(
    extensions.map(async (extension) => {
      try {
        for (const slug of await discoverThemeSlugs(http, extension)) {
          targets.set(`${extension.publisher}.${extension.slug}/${slug}`, {
            extension,
            slug,
          });
        }
      } catch (error) {
        events.onError?.(`${extension.publisher}.${extension.slug}`, error);
      }
    }),
  );
  events.onThemesDiscovered?.(targets.size);
  await Promise.all(
    [...targets].map(async ([id, { extension, slug }]) => {
      if (cache.has(id)) return;
      try {
        const theme = await fetchTheme(http, extension, slug);
        await cache.add(theme);
        events.onTheme?.(theme);
      } catch (error) {
        events.onError?.(id, error);
      }
    }),
  );
  return withRanks(cache.all(), extensions).sort((a, b) =>
    a.id.localeCompare(b.id),
  );
}

export function withRanks(
  themes: Theme[],
  extensionsByInstalls: Array<{ publisher: string; slug: string }>,
): Theme[] {
  const rankOf = new Map(
    extensionsByInstalls.map((e, i) => [`${e.publisher}.${e.slug}`, i + 1]),
  );
  return themes.map((theme) => {
    const rank = rankOf.get(
      `${theme.extension.publisher}.${theme.extension.slug}`,
    );
    return rank === undefined
      ? theme
      : { ...theme, extension: { ...theme.extension, rank } };
  });
}
