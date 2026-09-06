import { useCallback, useEffect, useRef, useState } from 'react';
import type { Observation } from '@vscodethemes/shared';
import type {
  Engine,
  PopularMatch,
  RankedMatch,
  WorkerRequest,
  WorkerResponse,
} from '../workers/protocol.ts';
import { fileToPixels } from '../lib/image.ts';

export type IdentifierStatus =
  'loading-index' | 'idle' | 'working' | 'done' | 'error';
export type ModelState = 'loading' | 'ready' | 'unavailable';

export interface IdentifierState {
  status: IdentifierStatus;
  model: ModelState;
  themes: number;
  error: string | null;
  screenshotUrl: string | null;
  observation: Observation | null;
  matches: RankedMatch[];
  popular: PopularMatch | null;
  engine: Engine | null;
  ms: number;
}

const INITIAL: IdentifierState = {
  status: 'loading-index',
  model: 'loading',
  themes: 0,
  error: null,
  screenshotUrl: null,
  observation: null,
  matches: [],
  popular: null,
  engine: null,
  ms: 0,
};

export function useIdentifier() {
  const worker = useRef<Worker | null>(null);
  const requestId = useRef(0);
  const [state, setState] = useState<IdentifierState>(INITIAL);

  useEffect(() => {
    const instance = new Worker(
      new URL('../workers/identify.worker.ts', import.meta.url),
      { type: 'module' },
    );
    worker.current = instance;
    instance.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      if (message.type === 'ready')
        setState((s) => ({ ...s, status: 'idle', themes: message.themes }));
      if (message.type === 'model')
        setState((s) => ({ ...s, model: message.state }));
      if (message.type === 'error')
        setState((s) => ({ ...s, status: 'error', error: message.message }));
      if (
        message.type === 'result' &&
        message.requestId === requestId.current
      ) {
        setState((s) => ({
          ...s,
          status: 'done',
          observation: message.observation,
          matches: message.matches,
          popular: message.popular,
          engine: message.engine,
          ms: message.ms,
        }));
      }
    };
    const load: WorkerRequest = {
      type: 'load',
      baseUrl: import.meta.env.BASE_URL,
    };
    instance.postMessage(load);
    return () => instance.terminate();
  }, []);

  const identify = useCallback(async (file: Blob) => {
    if (!worker.current) return;
    setState((s) => ({ ...s, status: 'working', error: null }));
    try {
      const { pixels, previewUrl } = await fileToPixels(file);
      requestId.current += 1;
      setState((s) => {
        if (s.screenshotUrl) URL.revokeObjectURL(s.screenshotUrl);
        return { ...s, screenshotUrl: previewUrl };
      });
      const request: WorkerRequest = {
        type: 'identify',
        requestId: requestId.current,
        pixels,
      };
      worker.current.postMessage(request, [pixels.data.buffer as ArrayBuffer]);
    } catch (error) {
      setState((s) => ({
        ...s,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }, []);

  const reset = useCallback(() => {
    setState((s) => {
      if (s.screenshotUrl) URL.revokeObjectURL(s.screenshotUrl);
      return {
        ...s,
        status: 'idle',
        screenshotUrl: null,
        observation: null,
        matches: [],
        popular: null,
        engine: null,
        ms: 0,
        error: null,
      };
    });
  }, []);

  return { state, identify, reset };
}
