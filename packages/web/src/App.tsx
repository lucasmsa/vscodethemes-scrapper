import { useIdentifier } from './hooks/useIdentifier.ts';
import { useDropZone } from './hooks/useDropZone.ts';
import { usePageTheme } from './hooks/usePageTheme.ts';
import { TitleBar } from './components/TitleBar.tsx';
import { ActivityRail } from './components/ActivityRail.tsx';
import { TabStrip } from './components/TabStrip.tsx';
import { DropZone } from './components/DropZone.tsx';
import { Sampled } from './components/Sampled.tsx';
import { Confidence } from './components/Confidence.tsx';
import { Matches } from './components/Matches.tsx';
import { Explainer } from './components/Explainer.tsx';
import { StatusBar } from './components/StatusBar.tsx';

const STATUS_LABEL: Record<string, string> = {
  'loading-index': 'loading',
  idle: 'ready',
  working: 'matching',
  done: 'matched',
  error: 'error',
};

export function App() {
  const { state, identify, reset } = useIdentifier();
  const drop = useDropZone(identify);
  usePageTheme(state.matches[0]);
  const hasResult = state.status === 'done' && state.matches.length > 0;

  return (
    <div className="window">
      <TitleBar />
      <ActivityRail />
      <TabStrip hasScreenshot={hasResult} />
      <main className="editor">
        {state.error && <div className="error">{state.error}</div>}
        {!hasResult && (
          <>
            <h1 className="hero__title">
              What is <em>my</em> theme?
            </h1>
            <p className="hero__lede">
              Saw an editor in a screenshot, a stream or a tweet and want that
              theme? Drop the image here. The page samples its colors and finds
              the closest VS Code themes, right in your browser.
            </p>
            <DropZone
              {...drop}
              busy={state.status === 'working'}
              loading={
                state.status === 'loading-index' || state.model === 'loading'
              }
              themes={state.themes}
            />
          </>
        )}
        {hasResult && state.observation && (
          <div className="result">
            <div>
              <h2 className="result__heading">
                {state.matches[0]!.theme.displayName}
              </h2>
              <p className="result__sub">
                closest of {state.themes.toLocaleString('en-US')} themes by{' '}
                {state.engine === 'hybrid'
                  ? 'model and colors'
                  : 'color distance'}
                , page colored like it
              </p>
              {state.screenshotUrl && (
                <img
                  className="screenshot"
                  src={state.screenshotUrl}
                  alt="your screenshot"
                />
              )}
              <Sampled observation={state.observation} />
              {state.engine && (
                <Confidence
                  engine={state.engine}
                  layout={state.observation.layout}
                />
              )}
              <p style={{ marginTop: 24 }}>
                <button
                  className="button button--ghost"
                  type="button"
                  onClick={reset}
                >
                  try another screenshot
                </button>
              </p>
            </div>
            <div>
              <Matches matches={state.matches} />
              <Explainer themes={state.themes} engine={state.engine} />
            </div>
          </div>
        )}
      </main>
      <StatusBar
        status={STATUS_LABEL[state.status] ?? state.status}
        themes={state.themes}
        model={state.model}
        ms={state.ms}
      />
    </div>
  );
}
