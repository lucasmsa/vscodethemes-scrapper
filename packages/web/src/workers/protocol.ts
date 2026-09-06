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

/** The most installed theme wearing roughly the winner's palette. */
export interface PopularMatch {
  theme: IndexedTheme;
  /** Its own distance to the screenshot, on the scale the match rows print. */
  distance: number;
  /** How far its palette sits from the winner's. */
  apart: number;
  /** Themes inside the band, the winner included. */
  considered: number;
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
      popular: PopularMatch | null;
      ms: number;
    }
  | { type: 'error'; message: string };
