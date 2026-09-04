import type { Observation } from '@vscodethemes/shared';
import accuracy from '../generated/accuracy.json';
import type { Engine } from '../workers/protocol.ts';

interface CropStats {
  n: number;
  top1: number;
  top5: number;
  top5Class: number | null;
}

interface RunStats {
  gallery: number;
  queries: number;
  window: CropStats | null;
  partial: CropStats | null;
  editor: CropStats | null;
}

const ACCURACY = accuracy as Partial<Record<Engine, RunStats>>;

const pct = (value: number) => `${value.toFixed(1)}%`;

interface ConfidenceProps {
  engine: Engine;
  layout: Observation['layout'];
}

const ENGINE_NAME: Record<Engine, string> = {
  hybrid: 'the model plus color matching',
  knn: 'color matching alone',
};

export function Confidence({ engine, layout }: ConfidenceProps) {
  const run = ACCURACY[engine];
  const stats = layout === 'window' ? run?.window : run?.editor;
  if (!run || !stats) return null;
  const cut = layout === 'window' ? 'whole editor windows' : 'code-only crops';
  const top5 = (stats.top5Class ?? stats.top5).toFixed(1);
  return (
    <p className="confidence" data-testid="confidence">
      In testing on {stats.n.toLocaleString('en-US')} held-out previews cut as{' '}
      {cut}, {ENGINE_NAME[engine]} put the right palette in its top five {top5}%
      of the time and first {stats.top1.toFixed(1)}% of the time, against all{' '}
      {run.gallery.toLocaleString('en-US')} themes.
      {layout === 'editor-only' &&
        ' A screenshot with the activity bar and status bar in it does much better.'}
    </p>
  );
}
