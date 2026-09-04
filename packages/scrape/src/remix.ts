export const SITE = 'https://vscodethemes.com';
export const INDEX_ROUTE = 'routes/_index';
export const THEME_ROUTE = 'routes/e.$slug.$theme';

export interface RemixContext {
  state: { loaderData: Record<string, unknown> };
}

const CONTEXT_PATTERN =
  /window\.__remixContext\s*=\s*(\{[\s\S]*?\});<\/script>/;

export function parseRemixContext(html: string): RemixContext {
  const match = CONTEXT_PATTERN.exec(html);
  if (!match?.[1]) {
    throw new Error('window.__remixContext not found in page');
  }
  return JSON.parse(match[1]) as RemixContext;
}

export function loaderDataFromHtml<T>(html: string, route: string): T {
  const data = parseRemixContext(html).state.loaderData[route];
  if (data === undefined) {
    throw new Error(`loader data for ${route} not found`);
  }
  return data as T;
}

export function dataUrl(
  path: string,
  route: string,
  params: Record<string, string | number> = {},
): string {
  const url = new URL(path, SITE);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  url.searchParams.set('_data', route);
  return url.toString();
}
