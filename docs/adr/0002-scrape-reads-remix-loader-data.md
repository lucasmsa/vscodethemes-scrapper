# 2. The scrape reads the site's loader data over plain HTTP

Date: 2026-09-04

## Status

Accepted

## Decision

- Fetch `https://vscodethemes.com/?page=N&_data=routes%2F_index` for the
  extension list and `/e/<publisher>.<extension>/<theme>?page=K&_data=routes%2Fe.%24slug.%24theme`
  for theme pages. The same data is inlined in every HTML page as
  `window.__remixContext`; the parser handles both and the HTML path is the
  fallback.
- The index paginates extensions, 36 per page, and shows at most 10 theme
  names per extension. A theme page lists 16 sibling themes per `page` and the
  full palette of the requested theme, so the crawler pages through siblings
  to enumerate every theme, then fetches each theme once.
- Concurrency 8 to 12 with exponential backoff on 429 and 5xx, an append-only
  NDJSON cache so a stopped run resumes, and `data/themes.json` written sorted
  by id for stable diffs.
- Previews go through a `Storage` interface: `LocalStorage` (default,
  `./previews`) or `S3Storage` when `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
  `AWS_REGION` and `BUCKET_NAME` are all set. Keys keep the historical
  `<OfficialName>/<slug>-<lang>` layout, now `.svg`. Half-configured S3 is an
  error, not a silent fallback.
- No Puppeteer, no stealth plugin, no per-language screenshotting.

## Context

The site moved to Remix in 2024. Observed on 2026-09-04:

| Check                                                     | Result                                    |
| --------------------------------------------------------- | ----------------------------------------- |
| `?language=py` on a theme page                            | 200, same preview image                   |
| `<text x="50%" y="14">` name selector                     | gone                                      |
| `?_data=routes%2F_index&page=2`                           | 200, `application/json`, 40 KB            |
| `?extensionsPageSize=200` or `themesPageSize=100`         | ignored, server keeps 36 and 16           |
| theme page `?page=21` for daylerees.rainglow (325 themes) | 4 siblings; `?page=22` returns none       |
| preview URL with `-py-` in place of `-js-`                | 200, different bytes; `ts` and `rust` 404 |
| 40 preview SVGs at concurrency 16                         | 1.1 s                                     |

The site's `total` field counts extensions, not themes: 441 pages x 36 = 15,876
extensions, which resolve to 32,745 theme slugs.

## Consequences

- A full metadata crawl is about 16k small JSON requests plus one request
  per theme, and the code has no browser dependency.
- The previews are still fetched as SVG (7 languages per theme) when the eval
  or training needs them; the web page links to the upstream URL instead of
  re-hosting.
