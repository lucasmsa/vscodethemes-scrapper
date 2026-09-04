import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, resolve } from 'node:path';
import { buildThemeIndex } from '@vscodethemes/shared';
import { readThemes } from './themes.ts';

const ROOT = resolve(import.meta.dirname, '../../..');
const REPORT = join(ROOT, 'eval/report.json');
const OUT = join(ROOT, 'packages/web/public/themes.index.json');
const ACCURACY = join(ROOT, 'packages/web/src/generated/accuracy.json');

/** The page names its engines; each maps to the eval runs that measured that exact path. */
const RUN_FOR_ENGINE: Record<string, readonly string[]> = {
  hybrid: ['hybrid'],
  cnn: ['cnn-onnx', 'cnn'],
  knn: ['knn'],
};

interface CropTally {
  n: number;
  top1: number;
  top5: number;
  top5Class?: number;
}

interface Run {
  approach: string;
  gallery: number;
  queries: number;
  byCrop: Record<string, CropTally>;
  generatedAt?: string;
}

const themes = await readThemes(ROOT);
const index = buildThemeIndex(themes);
const json = JSON.stringify(index);
await mkdir(join(ROOT, 'packages/web/public'), { recursive: true });
await writeFile(OUT, json);
const kb = (n: number) => `${(n / 1024).toFixed(0)} KB`;
const classes = new Set(index.classes).size;
console.log(
  `${themes.length} themes in ${classes} palette classes -> ${OUT}: ${kb(json.length)} raw, ${kb(gzipSync(json).length)} gzip`,
);

/** The page quotes measured hit rates per crop kind, from the latest full-gallery run of the engine in use. */
if (existsSync(REPORT)) {
  const { runs } = JSON.parse(await readFile(REPORT, 'utf8')) as {
    runs: Run[];
  };
  // One theme has no preview render, so a full-gallery run searches all but a handful.
  const fullEnough = themes.length * 0.99;
  const accuracy = Object.fromEntries(
    Object.entries(RUN_FOR_ENGINE).flatMap(([engine, approaches]) => {
      const run = [...runs]
        .reverse()
        .find(
          (r) => approaches.includes(r.approach) && r.gallery >= fullEnough,
        );
      if (!run) return [];
      const pick = (crop: string) => {
        const tally = run.byCrop[crop];
        return tally
          ? {
              n: tally.n,
              top1: tally.top1,
              top5: tally.top5,
              top5Class: tally.top5Class ?? null,
            }
          : null;
      };
      return [
        [
          engine,
          {
            run: run.approach,
            gallery: run.gallery,
            queries: run.queries,
            window: pick('window'),
            partial: pick('partial'),
            editor: pick('editor'),
            generatedAt: run.generatedAt ?? null,
          },
        ],
      ];
    }),
  );
  await mkdir(join(ROOT, 'packages/web/src/generated'), { recursive: true });
  await writeFile(ACCURACY, `${JSON.stringify(accuracy, null, 2)}\n`);
  console.log(
    `accuracy for ${Object.keys(accuracy).join(', ') || 'no full-gallery run yet'} -> ${ACCURACY}`,
  );
}
