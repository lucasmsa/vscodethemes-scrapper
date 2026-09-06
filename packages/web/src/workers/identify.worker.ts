import {
  classMembersIndex,
  collapseToClasses,
  expandThemeIndex,
  extractObservation,
  orderByScore,
  prepareThemes,
  rankThemes,
  scoreTheme,
  type IndexedTheme,
  type PreparedTheme,
  type ThemeIndex,
} from '@vscodethemes/shared';
import { embed, loadModel, type Model } from '../lib/model.ts';
import { rankBySimilarity } from '../lib/similarity.ts';
import type {
  Engine,
  RankedMatch,
  WorkerRequest,
  WorkerResponse,
} from './protocol.ts';

interface Scored {
  theme: IndexedTheme;
  distance: number;
  fields: string[];
  similarity?: number;
}

const CANDIDATES = 200;
const RESULTS = 5;

let prepared: PreparedTheme[] | null = null;
let membersOf: ((paletteClass: number) => IndexedTheme[]) | null = null;
let model: Model | null = null;

const post = (message: WorkerResponse) => self.postMessage(message);

async function load(baseUrl: string) {
  const response = await fetch(`${baseUrl}themes.index.json`);
  if (!response.ok) throw new Error(`index ${response.status}`);
  const index = (await response.json()) as ThemeIndex;
  const indexed = expandThemeIndex(index);
  prepared = prepareThemes(indexed);
  membersOf = classMembersIndex(indexed);
  post({ type: 'ready', themes: prepared.length });
  try {
    model = await loadModel(baseUrl);
    if (model.meta.count !== prepared.length)
      throw new Error('gallery and index disagree on theme count');
    post({ type: 'model', state: 'ready' });
  } catch (error) {
    model = null;
    post({
      type: 'model',
      state: 'unavailable',
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}

async function rank(pixels: Parameters<typeof extractObservation>[0]) {
  const observation = extractObservation(pixels);
  let engine: Engine = 'knn';
  let scored: Scored[];
  if (model) {
    const embedding = await embed(model, pixels);
    const hits = rankBySimilarity(
      embedding,
      model.gallery,
      model.meta.dim,
      model.meta.scale,
      CANDIDATES,
    );
    // The model narrows 32,742 themes to 200 candidates; the measured colors decide the order.
    scored = orderByScore(
      hits.map(({ row, similarity }) => {
        const candidate = prepared![row]!;
        return {
          theme: candidate.theme,
          similarity,
          ...scoreTheme(observation, candidate),
        };
      }),
    );
    engine = 'hybrid';
  } else {
    scored = rankThemes(observation, prepared!, CANDIDATES);
  }
  const matches: RankedMatch[] = collapseToClasses(
    scored,
    membersOf!,
    RESULTS,
  ).map((c) => ({
    theme: c.theme,
    identical: c.identical,
    distance: c.score.distance,
    fields: c.score.fields,
    ...(c.score.similarity !== undefined
      ? { similarity: c.score.similarity }
      : {}),
  }));
  return { observation, engine, matches };
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  try {
    if (message.type === 'load') return await load(message.baseUrl);
    if (!prepared || !membersOf) throw new Error('index not loaded');
    const started = performance.now();
    const { observation, engine, matches } = await rank(message.pixels);
    post({
      type: 'result',
      requestId: message.requestId,
      engine,
      observation,
      matches,
      ms: Math.round(performance.now() - started),
    });
  } catch (error) {
    post({
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
