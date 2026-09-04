import { deltaE, rgbToLab, type Lab, type Rgb } from './color.ts';

export interface PixelImage {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array;
}

export type ObservedField =
  | 'editorBackground'
  | 'editorForeground'
  | 'activityBarBackground'
  | 'statusBarBackground';

export interface Observation {
  colors: Partial<Record<ObservedField, Rgb>>;
  topStrips: Rgb[];
  layout: 'window' | 'editor-only';
}

const MAX_SAMPLE_WIDTH = 320;
const RUN_THRESHOLD = 2.5;
const DISTINCT_THRESHOLD = 2;
const MIN_STRIP_PX = 2;
const MIN_STRIP_RATIO = 0.02;
const MAX_STRIP_RATIO = 0.16;
const MAX_ACTIVITY_BAR_RATIO = 0.14;
const FOREGROUND_CONTRAST = 20;

interface Run {
  start: number;
  end: number;
  color: Rgb;
  lab: Lab;
}

function downsample(image: PixelImage) {
  const step = Math.max(1, Math.floor(image.width / MAX_SAMPLE_WIDTH));
  return {
    width: Math.floor(image.width / step),
    height: Math.floor(image.height / step),
    step,
    stride: image.width * 4,
    data: image.data,
  };
}

type Sampler = ReturnType<typeof downsample>;

function offset(s: Sampler, x: number, y: number): number {
  return y * s.step * s.stride + x * s.step * 4;
}

function pixelAt(s: Sampler, x: number, y: number): Rgb {
  const i = offset(s, x, y);
  return [s.data[i]!, s.data[i + 1]!, s.data[i + 2]!];
}

function isOpaque(s: Sampler, x: number, y: number): boolean {
  return s.data[offset(s, x, y) + 3]! > 200;
}

const bin = (c: number, bits: number) => c >> (8 - bits);

function modeColor(pixels: Rgb[], bits = 5): Rgb | null {
  if (pixels.length === 0) return null;
  const counts = new Map<
    number,
    { n: number; r: number; g: number; b: number }
  >();
  for (const [r, g, b] of pixels) {
    const key = (bin(r, bits) << 16) | (bin(g, bits) << 8) | bin(b, bits);
    const entry = counts.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    entry.n++;
    entry.r += r;
    entry.g += g;
    entry.b += b;
    counts.set(key, entry);
  }
  let best: { n: number; r: number; g: number; b: number } | null = null;
  for (const entry of counts.values())
    if (!best || entry.n > best.n) best = entry;
  return best
    ? [
        Math.round(best.r / best.n),
        Math.round(best.g / best.n),
        Math.round(best.b / best.n),
      ]
    : null;
}

function lineModes(
  s: Sampler,
  axis: 'row' | 'column',
  from: number,
  to: number,
  count: number,
): Array<Rgb | null> {
  const modes: Array<Rgb | null> = [];
  for (let i = 0; i < count; i++) {
    const pixels: Rgb[] = [];
    for (let j = from; j < to; j++) {
      const [x, y] = axis === 'row' ? [j, i] : [i, j];
      if (isOpaque(s, x, y)) pixels.push(pixelAt(s, x, y));
    }
    modes.push(modeColor(pixels));
  }
  return modes;
}

function segment(modes: Array<Rgb | null>): Run[] {
  const runs: Run[] = [];
  for (let i = 0; i < modes.length; i++) {
    const color = modes[i];
    if (!color) continue;
    const lab = rgbToLab(color);
    const last = runs[runs.length - 1];
    if (last && last.end === i && deltaE(last.lab, lab) <= RUN_THRESHOLD) {
      last.end = i + 1;
    } else {
      runs.push({ start: i, end: i + 1, color, lab });
    }
  }
  return runs;
}

const length = (run: Run) => run.end - run.start;

function largest(runs: Run[]): Run | undefined {
  return runs.reduce<Run | undefined>(
    (best, run) => (!best || length(run) > length(best) ? run : best),
    undefined,
  );
}

function distinct(a: Run, b: Run): boolean {
  return deltaE(a.lab, b.lab) > DISTINCT_THRESHOLD;
}

function blockPixels(
  s: Sampler,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
): Rgb[] {
  const pixels: Rgb[] = [];
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++)
      if (isOpaque(s, x, y)) pixels.push(pixelAt(s, x, y));
  return pixels;
}

export function extractObservation(image: PixelImage): Observation {
  const s = downsample(image);
  const xFrom = Math.floor(s.width * 0.4);
  const xTo = Math.floor(s.width * 0.95);
  const rows = segment(lineModes(s, 'row', xFrom, xTo, s.height));
  const editorRows = largest(rows);
  if (!editorRows) return { colors: {}, topStrips: [], layout: 'editor-only' };

  const colors: Observation['colors'] = {};
  const maxStrip = Math.max(
    MIN_STRIP_PX,
    Math.floor(s.height * MAX_STRIP_RATIO),
  );
  const minStrip = Math.max(
    MIN_STRIP_PX,
    Math.ceil(s.height * MIN_STRIP_RATIO),
  );

  const topStrips = rows

    .filter(
      (run) =>
        run.end <= editorRows.start &&
        length(run) >= minStrip &&
        length(run) <= maxStrip,
    )
    .filter((run) => distinct(run, editorRows) || run.end < editorRows.start)
    .slice(-3)
    .map((run) => run.color);

  const bottom = rows.filter(
    (run) =>
      run.start >= editorRows.end &&
      length(run) >= minStrip &&
      length(run) <= maxStrip,
  );
  const statusRun = bottom[bottom.length - 1];
  if (statusRun && distinct(statusRun, editorRows))
    colors.statusBarBackground = statusRun.color;

  const editorHeight = length(editorRows);
  const yFrom = editorRows.start + Math.floor(editorHeight * 0.1);
  const yTo = editorRows.end - Math.floor(editorHeight * 0.1);
  const columns = segment(lineModes(s, 'column', yFrom, yTo, s.width));
  const leftRun = columns[0];
  const nextRun = columns[1];
  if (
    leftRun &&
    nextRun &&
    length(leftRun) <= s.width * MAX_ACTIVITY_BAR_RATIO &&
    length(leftRun) >= MIN_STRIP_PX &&
    distinct(leftRun, nextRun)
  ) {
    colors.activityBarBackground = leftRun.color;
  }

  const editorPixels = blockPixels(s, xFrom, xTo, yFrom, yTo);
  const background = modeColor(editorPixels) ?? editorRows.color;
  colors.editorBackground = background;
  const backgroundLab = rgbToLab(background);
  const inkPixels = editorPixels.filter(
    (p) => deltaE(rgbToLab(p), backgroundLab) > FOREGROUND_CONTRAST,
  );
  const foreground = modeColor(inkPixels, 4);
  if (foreground && inkPixels.length > editorPixels.length * 0.005)
    colors.editorForeground = foreground;

  const layout =
    topStrips.length > 0 ||
    colors.statusBarBackground ||
    colors.activityBarBackground
      ? 'window'
      : 'editor-only';
  return { colors, topStrips, layout };
}
