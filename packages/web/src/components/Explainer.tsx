import type { Engine } from '../workers/protocol.ts';
import accuracy from '../generated/accuracy.json';

type Measured = Record<
  string,
  { window: { top5: number; top5Class: number | null } } | undefined
>;

const windowTop5 = (engine: string) => {
  const window = (accuracy as Measured)[engine]?.window;
  if (!window) return null;
  return Math.round(window.top5Class ?? window.top5);
};

const COMPARISON: Array<{ label: string; engine: string }> = [
  { label: 'both together', engine: 'hybrid' },
  { label: 'the network alone', engine: 'cnn' },
  { label: 'the colors alone', engine: 'knn' },
];

interface ExplainerProps {
  themes: number;
  engine: Engine | null;
}

export function Explainer({ themes, engine }: ExplainerProps) {
  const gallery = themes.toLocaleString('en-US');
  return (
    <section className="explainer">
      <h3>how the match is made</h3>

      <h4>1. It reads the window, not the code</h4>
      <p>
        A theme decides four things you can see without reading a single line:
        the editor background, the narrow bar down the left, the bar along the
        bottom and the strip of tabs on top. The page finds those four areas in
        your screenshot and takes the most common color in each. Syntax colors
        are skipped on purpose, because they change with whatever language you
        happened to have open.
      </p>

      {engine === 'hybrid' && (
        <>
          <h4>2. A small network narrows {gallery} themes down to 200</h4>
          <p>
            Thousands of dark themes sit on nearly the same background, so
            color on its own leaves far too many ties. A small network looks at
            the screenshot as a whole, the way you would from across the room,
            and keeps the 200 themes whose previews look most like it. It runs
            in your browser, not on a server.
          </p>

          <h4>3. The measured colors pick the winner</h4>
          <p>
            Those 200 are then sorted by how far their real colors sit from the
            ones sampled out of your screenshot. The network is good at
            narrowing and bad at deciding; the colors are the opposite.
          </p>

          <table className="explainer__table">
            <caption>
              In the top five, on whole-window screenshots
            </caption>
            <tbody>
              {COMPARISON.map(({ label, engine: key }) => {
                const rate = windowTop5(key);
                return rate === null ? null : (
                  <tr key={key}>
                    <th scope="row">{label}</th>
                    <td>{rate}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      <h4>What the distance means</h4>
      <p>
        Colors are compared in CIE Lab, a space built so that equal distances
        look equally different to the eye. The gap is written as ΔE.
      </p>
      <dl className="explainer__scale">
        <div>
          <dt>under 1</dt>
          <dd>the same color</dd>
        </div>
        <div>
          <dt>under 2.3</dt>
          <dd>a difference the eye cannot see</dd>
        </div>
        <div>
          <dt>above 10</dt>
          <dd>a different color</dd>
        </div>
      </dl>

      <h4>What it cannot tell you</h4>
      <p>
        Many themes are exact copies of each other in every color read here,
        often a theme and its own no-italics variant. Those are grouped and
        listed together rather than ranked, because nothing in a screenshot can
        separate them. A crop showing only code leaves three of the four areas
        missing, and the result gets much weaker.
      </p>

      <p>Nothing leaves your browser. The screenshot is never uploaded.</p>
    </section>
  );
}
