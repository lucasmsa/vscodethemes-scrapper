/**
 * Render training previews for the CNN: renders/<safe id>/<lang>.jpg at half preview size.
 * usage: npm run eval:render -- --themes 2000 --seed 42 [--gallery all]
 */
import { parseArgs } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import pLimit from 'p-limit';
import {
  PREVIEW_LANGUAGES,
  type PreviewLanguage,
  type Theme,
} from '@vscodethemes/shared';
import { createHttp } from '../src/http.ts';
import { LocalStorage, previewKey } from '../src/storage.ts';
import { downloadPreviews } from '../src/previews.ts';
import { readThemes } from '../src/themes.ts';
import { renderSvgPng, sample, seededRandom } from './queries.ts';

const ROOT = resolve(import.meta.dirname, '../../..');
const PREVIEWS_DIR = join(ROOT, 'previews');
const RENDERS_DIR = join(ROOT, 'renders');
const QUERIES_DIR = join(ROOT, 'eval/queries');
const RENDER_ZOOM = 0.5;

const { values } = parseArgs({
  options: {
    themes: { type: 'string', default: '2000' },
    seed: { type: 'string', default: '42' },
    gallery: { type: 'string', default: 'sample' },
    classes: { type: 'string' },
    languages: { type: 'string' },
  },
});

export const safeId = (id: string) => id.replaceAll('/', '__');

const all = await readThemes(ROOT);
const manifestPath = join(
  QUERIES_DIR,
  `manifest-${values.themes}-${values.seed}.json`,
);
const HELD_OUT_DEFAULT = ['css', 'java'];
let sampleIds: Set<string>;
let heldOut: string[];
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
    heldOut: string[];
    specs: Array<{ id: string }>;
  };
  sampleIds = new Set(manifest.specs.map((s) => s.id));
  heldOut = manifest.heldOut;
} else {
  // Same seeded shuffle the eval uses, so renders can start before the manifest exists.
  sampleIds = new Set(
    sample(all, Number(values.themes), seededRandom(Number(values.seed))).map(
      (t) => t.id,
    ),
  );
  heldOut = HELD_OUT_DEFAULT;
}
/** Training classes: the eval sample plus the first N-sample other themes in data/themes.json order (same rule as model/wimt/train.py). */
function trainingClasses(count: number): Set<string> {
  const chosen = new Set(sampleIds);
  for (const theme of all) {
    if (chosen.size >= count) break;
    chosen.add(theme.id);
  }
  return chosen;
}

const selected = values.classes
  ? trainingClasses(Number(values.classes))
  : sampleIds;
const themes =
  values.gallery === 'all' ? all : all.filter((t) => selected.has(t.id));
const languages = (
  values.languages
    ? (values.languages.split(',') as PreviewLanguage[])
    : PREVIEW_LANGUAGES
).filter((l) => !heldOut.includes(l));
console.log(`${themes.length} themes x ${languages.join(',')}`);

const storage = new LocalStorage(PREVIEWS_DIR);
const http = createHttp({ concurrency: 16 });
let downloaded = 0;
await downloadPreviews(http, storage, themes, languages, {
  onSaved: () => downloaded++,
});
console.log(
  `previews: ${downloaded} downloaded for ${themes.length} themes x ${languages.length} languages`,
);

const limit = pLimit(12);
let rendered = 0;
let skipped = 0;
await Promise.all(
  themes.flatMap((theme) =>
    languages.map((language) =>
      limit(async () => {
        const out = join(RENDERS_DIR, safeId(theme.id), `${language}.jpg`);
        if (existsSync(out)) {
          skipped++;
          return;
        }
        const svgPath = join(PREVIEWS_DIR, previewKey(theme, language));
        if (!existsSync(svgPath)) return;
        const png = await renderSvgPng(
          await readFile(svgPath, 'utf8'),
          RENDER_ZOOM,
        );
        await mkdir(join(RENDERS_DIR, safeId(theme.id)), { recursive: true });
        await writeFile(
          out,
          await sharp(png)
            .flatten({ background: '#000000' })
            .jpeg({ quality: 92 })
            .toBuffer(),
        );
        rendered++;
        if (rendered % 2000 === 0) console.log(`rendered ${rendered}`);
      }),
    ),
  ),
);
console.log(`renders: ${rendered} new, ${skipped} existing, in ${RENDERS_DIR}`);
