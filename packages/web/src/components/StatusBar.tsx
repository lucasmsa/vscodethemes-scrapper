import { formatCount } from '../lib/distance.ts';
import type { ModelState } from '../hooks/useIdentifier.ts';

interface StatusBarProps {
  status: string;
  themes: number;
  model: ModelState;
  ms: number;
}

const ENGINE_LABEL: Record<ModelState, string> = {
  loading: 'colors only, model loading',
  ready: 'model + colors, in-browser',
  unavailable: 'colors only, in-browser',
};

export function StatusBar({ status, themes, model, ms }: StatusBarProps) {
  return (
    <footer className="status-bar">
      <div className="status-bar__group">
        <span data-testid="status-themes">
          {themes ? `${formatCount(themes)} themes` : 'loading index...'}
        </span>
        <span>{status}</span>
      </div>
      <div className="status-bar__group">
        {ms > 0 && <span>{ms} ms</span>}
        <span className="status-bar__method" data-testid="status-engine">
          {ENGINE_LABEL[model]}
        </span>
        <a href="https://lucasmsa.com">lucasmsa.com</a>
      </div>
    </footer>
  );
}
