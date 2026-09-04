import type { Engine } from '../workers/protocol.ts';
import accuracy from '../generated/accuracy.json';

type Measured = Record<string, { window: { top5: number } } | undefined>;

const windowTop5 = (engine: string) =>
  (accuracy as Measured)[engine]?.window.top5.toFixed(1);
interface ExplainerProps {
  themes: number;
  engine: Engine | null;
}

export function Explainer({ themes, engine }: ExplainerProps) {
  return (
    <section className="explainer">
      <h3>how the match is made</h3>
      {engine === 'hybrid' && (
        <p>
          Two steps. A small convolutional network (865,888 weights, run in your
          browser through ONNX Runtime) turns the screenshot into 128 numbers
          and picks the 200 themes whose rendered previews sit closest in that
          space. Then the colors sampled below reorder those 200 by ΔE. Neither
          step alone does as well: on whole-window screenshots the pair reaches{' '}
          {windowTop5('hybrid')}% top-five against every theme, the network
          alone {windowTop5('cnn')}%, the colors alone {windowTop5('knn')}%.
        </p>
      )}
      <p>
        The page reads your screenshot in a worker, finds the editor area (the
        largest block of one color), the strip below it (status bar), the strips
        above it (title bar, tabs) and the narrow column on the left (activity
        bar), and takes the dominant color of each.
      </p>
      <p>
        Those colors go to CIE Lab and are compared with the same fields of
        every one of the {themes.toLocaleString('en-US')} themes scraped from
        vscodethemes.com. ΔE is the weighted Lab distance: under 1 is the same
        color, under 2.3 is a difference the eye cannot see, above 10 is a
        different color.
      </p>
      <p>Nothing leaves your browser. The screenshot is never uploaded.</p>
    </section>
  );
}
