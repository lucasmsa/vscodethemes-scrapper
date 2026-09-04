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

const pct = (value: number) => `${Math.round(value)}%`;

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
  return (
    <div className="confidence" data-testid="confidence">
      <h4 className="confidence__title">how often this is right</h4>
      <dl className="confidence__rates">
        <div>
          <dt>in the top five</dt>
          <dd>{pct(stats.top5Class ?? stats.top5)}</dd>
        </div>
        <div>
          <dt>ranked first</dt>
          <dd>{pct(stats.top1)}</dd>
        </div>
      </dl>
      <p className="confidence__note">
        Measured on {stats.n.toLocaleString('en-US')} screenshots the model
        never saw, cut as {cut}, searching all{' '}
        {run.gallery.toLocaleString('en-US')} themes with{' '}
        {ENGINE_NAME[engine]}.
      </p>
      {layout === 'editor-only' && run.window && (
        <p className="confidence__note">
          This one is code only, so it has less to go on. A screenshot with the
          activity bar and status bar in it reaches{' '}
          {pct(run.window.top5Class ?? run.window.top5)} in the top five.
        </p>
      )}
    </div>
  );
}
