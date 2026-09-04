import { parseArgs } from 'node:util';
import { writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import cliProgress from 'cli-progress';
import {
  PREVIEW_LANGUAGES,
  type PreviewLanguage,
  type Theme,
} from '@vscodethemes/shared';
import { createHttp } from './http.ts';
import { ThemeCache } from './cache.ts';
import { crawlThemes } from './crawl.ts';
import { downloadPreviews } from './previews.ts';
import { selectStorage } from './storage.ts';
import { readThemes, writeThemes } from './themes.ts';

const ROOT = resolve(import.meta.dirname, '../../..');
const CACHE_FILE = resolve(ROOT, 'data/.cache/themes.ndjson');
const PREVIEWS_DIR = resolve(ROOT, 'previews');

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    concurrency: { type: 'string', default: '8' },
    limit: { type: 'string' },
    offset: { type: 'string', default: '0' },
    languages: { type: 'string', default: PREVIEW_LANGUAGES.join(',') },
  },
});

const command = positionals[0] ?? 'metadata';
const http = createHttp({ concurrency: Number(values.concurrency) });

function bar(label: string, total: number) {
  const progress = new cliProgress.SingleBar(
    {
      format: `${label} {bar} {value}/{total} | {percentage}% | {duration_formatted}`,
    },
    cliProgress.Presets.shades_classic,
  );
  progress.start(total, 0);
  return progress;
}

async function metadata() {
  const cache = await ThemeCache.open(CACHE_FILE);
  console.log(`cache: ${cache.size} themes already fetched`);
  const ui: { progress: cliProgress.SingleBar | null } = { progress: null };
  const errors: string[] = [];
  const themes = await crawlThemes(http, cache, {
    onIndexPage: (page, count, total) =>
      console.log(
        `index page ${page}: ${count} extensions (${total} extensions on site)`,
      ),
    onThemesDiscovered: (count) => {
      console.log(`discovered ${count} theme slugs`);
      ui.progress = bar('themes', count);
      ui.progress.update(cache.size);
    },
    onTheme: () => ui.progress?.increment(),
    onError: (context, error) => errors.push(`${context}: ${String(error)}`),
  });
  ui.progress?.stop();
  await cache.close();
  const { bytes, gzipped } = await writeThemes(ROOT, themes);
  const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;
  console.log(
    `wrote ${themes.length} themes to data/themes.json (${mb(bytes)}) and .json.gz (${mb(gzipped)})`,
  );
  if (errors.length) {
    console.log(`${errors.length} errors`);
    for (const line of errors.slice(0, 20)) console.log(`  ${line}`);
  }
}

async function previews() {
  const all = await readThemes(ROOT);
  const offset = Number(values.offset);
  const limit = values.limit ? Number(values.limit) : all.length - offset;
  const themes = all.slice(offset, offset + limit);
  const languages = values.languages.split(',') as PreviewLanguage[];
  const storage = selectStorage(process.env, PREVIEWS_DIR);
  console.log(
    `storage: ${storage.kind}; ${themes.length} themes x ${languages.length} languages`,
  );
  const progress = bar('previews', themes.length * languages.length);
  let errors = 0;
  await downloadPreviews(http, storage, themes, languages, {
    onSaved: () => progress.increment(),
    onSkipped: () => progress.increment(),
    onError: () => {
      errors++;
      progress.increment();
    },
  });
  progress.stop();
  console.log(errors ? `${errors} previews failed` : 'all previews saved');
}

const commands: Record<string, () => Promise<void>> = { metadata, previews };
const run = commands[command];
if (!run) {
  console.error(`unknown command "${command}". Use: metadata | previews`);
  process.exit(1);
}
await run();
