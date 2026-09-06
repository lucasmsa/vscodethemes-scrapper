import { parseArgs } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import pLimit from 'p-limit';
import { resolve, join } from 'node:path';
import {
  PREVIEW_LANGUAGES,
  buildThemeIndex,
  LOOKALIKE_BAND,
  classMembers,
  classMembersIndex,
  collapseToClasses,
  expandThemeIndex,
  extractObservation,
  installsRank,
  paletteDistance,
  popularLookalike,
  prepareThemes,
  rankThemes,
  scoreTheme,
  type IndexedTheme,
  type PreviewLanguage,
  type Theme,
} from '@vscodethemes/shared';
import { createHttp } from '../src/http.ts';
import { LocalStorage, previewKey } from '../src/storage.ts';
import { readThemes } from '../src/themes.ts';
import { downloadPreviews } from '../src/previews.ts';
import {
  CROP_KINDS,
  decodeToPixels,
  renderQuery,
  sample,
  seededRandom,
  type QuerySpec,
} from './queries.ts';
import { embedWithOnnx, loadOnnxModel } from './onnx.ts';
import { rankBySimilarity } from '../../web/src/lib/similarity.ts';

const ROOT = resolve(import.meta.dirname, '../../..');
const PREVIEWS_DIR = join(ROOT, 'previews');
const QUERIES_DIR = join(ROOT, 'eval/queries');
const REPORT = join(ROOT, 'eval/report.json');

const HELD_OUT: PreviewLanguage[] = ['css', 'java'];
const TRAIN: PreviewLanguage[] = PREVIEW_LANGUAGES.filter(
  (l) => !HELD_OUT.includes(l),
);

const { values } = parseArgs({
  options: {
    themes: { type: 'string', default: '2000' },
    seed: { type: 'string', default: '42' },
    perTheme: { type: 'string', default: '2' },
    approach: { type: 'string', default: 'knn' },
    model: {
      type: 'string',
      default: resolve(import.meta.dirname, '../../web/public/model'),
    },
    download: { type: 'boolean', default: true },
  },
});

const sampleSize = Number(values.themes);
const seed = Number(values.seed);
const perTheme = Number(values.perTheme);

async function buildQuerySet(
  themes: Theme[],
  storage: LocalStorage,
): Promise<QuerySpec[]> {
  const manifestPath = join(QUERIES_DIR, `manifest-${sampleSize}-${seed}.json`);
  if (existsSync(manifestPath)) {
    return (
      JSON.parse(await readFile(manifestPath, 'utf8')) as { specs: QuerySpec[] }
    ).specs;
  }
  const random = seededRandom(seed);
  const chosen = sample(themes, sampleSize, random);
  if (values.download) {
    const http = createHttp({ concurrency: 16 });
    let saved = 0;
    await downloadPreviews(http, storage, chosen, PREVIEW_LANGUAGES, {
      onSaved: () => saved++,
    });
    console.log(`downloaded ${saved} previews for ${chosen.length} themes`);
  }
  const specs: QuerySpec[] = [];
  await mkdir(QUERIES_DIR, { recursive: true });
  const plan: Array<{
    theme: Theme;
    spec: Omit<QuerySpec, 'file'>;
    file: string;
    seed: number;
  }> = [];
  let i = 0;
  for (const theme of chosen) {
    for (let q = 0; q < perTheme; q++) {
      const language = HELD_OUT[q % HELD_OUT.length]!;
      const crop = CROP_KINDS[Math.floor(random() * CROP_KINDS.length)]!;
      const zoom = 0.75 + random() * 0.75;
      const quality = 60 + Math.floor(random() * 36);
      const file = `q-${String(i++).padStart(5, '0')}-${crop}.jpg`;
      plan.push({
        theme,
        spec: {
          id: theme.id,
          language,
          crop,
          zoom: Number(zoom.toFixed(2)),
          quality,
        },
        file,
        seed: Math.floor(random() * 2 ** 31),
      });
    }
  }
  const limit = pLimit(12);
  const rendered = await Promise.all(
    plan.map((item) =>
      limit(async () => {
        const svgPath = join(
          PREVIEWS_DIR,
          previewKey(item.theme, item.spec.language),
        );
        if (!existsSync(svgPath)) return null;
        const svg = await readFile(svgPath, 'utf8');
        await writeFile(
          join(QUERIES_DIR, item.file),
          await renderQuery(svg, item.spec, seededRandom(item.seed)),
        );
        return { ...item.spec, file: item.file } satisfies QuerySpec;
      }),
    ),
  );
  for (const spec of rendered) if (spec) specs.push(spec);
  await writeFile(
    manifestPath,
    JSON.stringify(
      { heldOut: HELD_OUT, train: TRAIN, sampleSize, seed, specs },
      null,
      1,
    ),
  );
  await writeFile(
    join(QUERIES_DIR, 'latest.json'),
    JSON.stringify({ manifest: manifestPath }),
  );
  return specs;
}

interface Tally {
  n: number;
  top1: number;
  top1Tied: number;
  top5: number;
  top1Class: number;
  top5Class: number;
}

/**
 * The popularity readout: among the candidates the ranking placed within `band` weighted
 * delta E of its winner, the most installed one. Measured at several widths because the
 * band is the only free parameter and its cost should be visible.
 */
const LOOKALIKE_BANDS = [0, 1, 1.5, LOOKALIKE_BAND, 5];

interface LookTally {
  n: number;
  /** Readout renders, meaning it names a palette class other than the one shown first. */
  fires: number;
  /** Readout names a class the five collapsed results do not carry. */
  notShown: number;
  /** Readout names the query theme's class when the first result did not. */
  rescue: number;
  /** Query theme is among the candidates inside the band. */
  truthInBand: number;
  /** Query theme is inside the band and something inside it has more installs. */
  truthOutranked: number;
  bandSum: number;
  /** How much further from the screenshot the readout sits than the first result. */
  worseSum: number;
  /** Readouts the page would label a different color, ΔE 10 and up. */
  overTen: number;
  aparts: number[];
  readoutRanks: number[];
  topRanks: number[];
}

const lookTally = (): LookTally => ({
  n: 0,
  fires: 0,
  notShown: 0,
  rescue: 0,
  truthInBand: 0,
  truthOutranked: 0,
  bandSum: 0,
  worseSum: 0,
  overTen: 0,
  aparts: [],
  readoutRanks: [],
  topRanks: [],
});

const median = (values: number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
};

const summarizeLook = (t: LookTally, band: number) => {
  const rate = (value: number, of: number) =>
    of ? Number(((100 * value) / of).toFixed(2)) : 0;
  return {
    band,
    fires: rate(t.fires, t.n),
    notShownWhenFires: rate(t.notShown, t.fires),
    rescue: rate(t.rescue, t.n),
    truthInBand: rate(t.truthInBand, t.n),
    truthOutranked: rate(t.truthOutranked, t.n),
    truthOutrankedWhenInBand: rate(t.truthOutranked, t.truthInBand),
    meanCandidates: t.n ? Number((t.bandSum / t.n).toFixed(2)) : 0,
    meanDeltaEOverTop: t.fires ? Number((t.worseSum / t.fires).toFixed(2)) : 0,
    medianApart: Number(median(t.aparts).toFixed(2)),
    overTenWhenFires: rate(t.overTen, t.fires),
    medianReadoutRank: median(t.readoutRanks),
    medianTopRank: median(t.topRanks),
  };
};

const tally = (): Tally => ({
  n: 0,
  top1: 0,
  top1Tied: 0,
  top5: 0,
  top1Class: 0,
  top5Class: 0,
});
const pct = (t: Tally, key: Exclude<keyof Tally, 'n'>) =>
  t.n ? Number(((100 * t[key]) / t.n).toFixed(2)) : 0;
const summarize = (t: Tally) => ({
  n: t.n,
  top1: pct(t, 'top1'),
  top1Tied: pct(t, 'top1Tied'),
  top5: pct(t, 'top5'),
  top1Class: pct(t, 'top1Class'),
  top5Class: pct(t, 'top5Class'),
});

type Candidates = (
  pixels: Awaited<ReturnType<typeof decodeToPixels>>,
) => Promise<
  Array<{
    theme: IndexedTheme;
    distance: number;
    fields: string[];
    similarity?: number;
  }>
>;

const CANDIDATES = 200;

async function score(
  themes: Theme[],
  specs: QuerySpec[],
  approach: string,
  candidates: Candidates,
  extra: Record<string, unknown>,
) {
  const indexed = expandThemeIndex(buildThemeIndex(themes));
  const membersOf = classMembersIndex(indexed);
  const classOf = new Map(indexed.map((t) => [t.id, t.paletteClass]));
  const byCrop = new Map<string, Tally>();
  const overall = tally();
  const looks = new Map(LOOKALIKE_BANDS.map((band) => [band, lookTally()]));
  const started = performance.now();
  // The readout sweep is instrumentation, not part of the path being timed.
  let sweepMs = 0;
  for (const [n, spec] of specs.entries()) {
    if (n % 1000 === 0) console.log(`scoring ${n}/${specs.length}`);
    const pixels = await decodeToPixels(
      await readFile(join(QUERIES_DIR, spec.file)),
    );
    const ranked = await candidates(pixels);
    const matches = ranked.slice(0, 5);
    const rank = matches.findIndex((m) => m.theme.id === spec.id);
    const best = matches[0]?.distance ?? Number.POSITIVE_INFINITY;
    const tiedAtTop =
      rank >= 0 && Math.abs(matches[rank]!.distance - best) < 1e-9;
    const classes = collapseToClasses(ranked, membersOf, 5);
    const classRank = classes.findIndex(
      (c) => c.theme.paletteClass === classOf.get(spec.id),
    );
    const truthClass = classOf.get(spec.id);
    const truthRepresentative =
      truthClass === undefined
        ? undefined
        : [...membersOf(truthClass)].sort(
            (a, b) => installsRank(a) - installsRank(b),
          )[0];
    const sweepStarted = performance.now();
    for (const [band, look] of looks) {
      look.n++;
      const winner = ranked[0]?.theme.palette;
      const inBand = winner
        ? ranked.filter((r) => paletteDistance(r.theme.palette, winner) <= band)
        : [];
      look.bandSum += inBand.length;
      const readout = popularLookalike(ranked, membersOf, band);
      if (readout) {
        look.fires++;
        look.worseSum += readout.score.distance - (ranked[0]?.distance ?? 0);
        if (readout.score.distance >= 10) look.overTen++;
        look.aparts.push(readout.apart);
        look.readoutRanks.push(installsRank(readout.theme));
        look.topRanks.push(installsRank(classes[0]!.theme));
        if (
          !classes.some(
            (c) => c.theme.paletteClass === readout.theme.paletteClass,
          )
        )
          look.notShown++;
        if (
          readout.theme.paletteClass === truthClass &&
          classes[0]?.theme.paletteClass !== truthClass
        )
          look.rescue++;
      }
      if (!inBand.some((r) => r.theme.id === spec.id)) continue;
      look.truthInBand++;
      const mostInstalled = inBand
        .map((r) => classMembers(r.theme, membersOf)[0]!)
        .reduce((a, b) => (installsRank(b) < installsRank(a) ? b : a));
      if (mostInstalled.id !== truthRepresentative?.id) look.truthOutranked++;
    }
    sweepMs += performance.now() - sweepStarted;
    const bucket = byCrop.get(spec.crop) ?? tally();
    for (const t of [bucket, overall]) {
      t.n++;
      if (rank === 0) t.top1++;
      if (tiedAtTop) t.top1Tied++;
      if (rank >= 0) t.top5++;
      if (classRank === 0) t.top1Class++;
      if (classRank >= 0) t.top5Class++;
    }
    byCrop.set(spec.crop, bucket);
  }
  const msPerQuery = Number(
    ((performance.now() - started - sweepMs) / specs.length).toFixed(1),
  );
  return {
    approach,
    ...extra,
    gallery: themes.length,
    paletteClasses: new Set(indexed.map((t) => t.paletteClass)).size,
    sampleSize,
    seed,
    heldOut: HELD_OUT,
    queries: overall.n,
    ...summarize(overall),
    lookalike: LOOKALIKE_BANDS.map((band) =>
      summarizeLook(looks.get(band)!, band),
    ),
    msPerQuery,
    byCrop: Object.fromEntries([...byCrop].map(([k, t]) => [k, summarize(t)])),
  };
}

const themes = await readThemes(ROOT);
const storage = new LocalStorage(PREVIEWS_DIR);
const specs = await buildQuerySet(themes, storage);
console.log(`${specs.length} queries from ${sampleSize} themes (seed ${seed})`);

const indexed = expandThemeIndex(buildThemeIndex(themes));
const prepared = prepareThemes(indexed);

async function candidatesFor(kind: string) {
  if (kind === 'knn') {
    return {
      approach: 'knn',
      extra: { engine: 'lab-knn' },
      candidates: (async (pixels) =>
        rankThemes(
          extractObservation(pixels),
          prepared,
          CANDIDATES,
        )) as Candidates,
    };
  }
  const model = await loadOnnxModel(values.model);
  if (model.meta.count !== indexed.length) {
    throw new Error(
      `gallery has ${model.meta.count} rows, index has ${indexed.length}`,
    );
  }
  console.log(
    `onnx gallery: ${model.meta.present}/${model.meta.count} themes embedded, dim ${model.meta.dim}`,
  );
  const retrieve: Candidates = async (pixels) => {
    const observation = extractObservation(pixels);
    const embedding = await embedWithOnnx(model, pixels);
    const hits = rankBySimilarity(
      embedding,
      model.gallery,
      model.meta.dim,
      model.meta.scale,
      CANDIDATES,
    );
    return hits.map(({ row, similarity }) => {
      const candidate = prepared[row]!;
      return {
        theme: candidate.theme,
        similarity,
        ...scoreTheme(observation, candidate),
      };
    });
  };
  if (kind === 'cnn') {
    return {
      approach: 'cnn-onnx',
      extra: {
        engine: 'onnx-in-node',
        embedded: model.meta.present,
        classes: model.meta.trainedClasses,
        epochs: model.meta.epochs,
      },
      candidates: retrieve,
    };
  }
  // hybrid: the model narrows the field, the measured colors decide the order.
  const hybrid: Candidates = async (pixels) => {
    const ranked = await retrieve(pixels);
    return [...ranked].sort(
      (a, b) =>
        a.distance - b.distance || (b.similarity ?? 0) - (a.similarity ?? 0),
    );
  };
  return {
    approach: 'hybrid',
    extra: {
      engine: 'onnx-retrieve-then-lab',
      embedded: model.meta.present,
      classes: model.meta.trainedClasses,
      epochs: model.meta.epochs,
    },
    candidates: hybrid,
  };
}

async function run() {
  const { approach, extra, candidates } = await candidatesFor(values.approach);
  return score(themes, specs, approach, candidates, extra);
}

const result = await run();
console.log(JSON.stringify(result, null, 1));
const existing = existsSync(REPORT)
  ? (JSON.parse(await readFile(REPORT, 'utf8')) as { runs: unknown[] })
  : { runs: [] };
existing.runs.push({ ...result, generatedAt: new Date().toISOString() });
await writeFile(REPORT, `${JSON.stringify(existing, null, 1)}\n`);
console.log(`appended to ${REPORT}`);
