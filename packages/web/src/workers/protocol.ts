import type {
  IndexedTheme,
  Observation,
  PixelImage,
} from '@vscodethemes/shared';

export type Engine = 'hybrid' | 'knn';

/** One palette class: the best-ranked member fronts it, the rest are listed as identical. */
export interface RankedMatch {
  theme: IndexedTheme;
  identical: IndexedTheme[];
  distance: number;
  fields: string[];
  similarity?: number;
}

export type WorkerRequest =
  | { type: 'load'; baseUrl: string }
  | { type: 'identify'; requestId: number; pixels: PixelImage };

export type WorkerResponse =
  | { type: 'ready'; themes: number }
  | { type: 'model'; state: 'ready' | 'unavailable'; reason?: string }
  | {
      type: 'result';
      requestId: number;
      engine: Engine;
      observation: Observation;
      matches: RankedMatch[];
      ms: number;
    }
  | { type: 'error'; message: string };
