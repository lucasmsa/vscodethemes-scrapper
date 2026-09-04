import { rgbToHex, type Observation } from '@vscodethemes/shared';

interface SampledProps {
  observation: Observation;
}

const LABELS: Array<[keyof Observation['colors'], string]> = [
  ['editorBackground', 'editor background'],
  ['editorForeground', 'editor text'],
  ['activityBarBackground', 'activity bar'],
  ['statusBarBackground', 'status bar'],
];

export function Sampled({ observation }: SampledProps) {
  const swatches: Array<{ hex: string; label: string }> = [];
  for (const [field, label] of LABELS) {
    const color = observation.colors[field];
    if (color) swatches.push({ hex: rgbToHex(color), label });
  }
  observation.topStrips.forEach((strip, i) =>
    swatches.push({
      hex: rgbToHex(strip),
      label:
        observation.topStrips.length === 1
          ? 'top strip'
          : i === 0
            ? 'title bar'
            : 'tab strip',
    }),
  );
  return (
    <div className="sampled">
      <div className="sampled__title">sampled from your screenshot</div>
      <ul className="sampled__list">
        {swatches.map((s) => (
          <li key={s.label}>
            <span
              className="swatch"
              style={{ background: s.hex }}
              data-testid="sampled-swatch"
            />
            <span>
              {s.label} {s.hex}
            </span>
          </li>
        ))}
      </ul>
      {observation.layout === 'editor-only' && (
        <p className="sampled__hint">
          Only the editor area was found. Many themes share an editor
          background, so include the activity bar and the status bar for a
          sharper match.
        </p>
      )}
    </div>
  );
}
