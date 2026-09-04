import { extractObservation, type PixelImage } from './extract.ts';
import { hexToRgb, type Rgb } from './color.ts';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

function paint(width: number, height: number, rects: Rect[]): PixelImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (const rect of rects) {
    const [r, g, b] = hexToRgb(rect.color);
    for (let y = rect.y; y < Math.min(height, rect.y + rect.h); y++) {
      for (let x = rect.x; x < Math.min(width, rect.x + rect.w); x++) {
        const i = (y * width + x) * 4;
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255;
      }
    }
  }
  return { width, height, data };
}

function sprinkleText(
  image: PixelImage,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  color: string,
  every = 7,
) {
  const [r, g, b] = hexToRgb(color);
  for (let y = y0; y < y1; y += 3) {
    for (let x = x0 + (y % every); x < x1; x += every) {
      const i = (y * image.width + x) * 4;
      image.data[i] = r;
      image.data[i + 1] = g;
      image.data[i + 2] = b;
    }
  }
}

const near = (actual: Rgb | undefined, hex: string, tolerance = 3) => {
  expect(actual).toBeDefined();
  const expected = hexToRgb(hex);
  actual!.forEach((c, i) =>
    expect(Math.abs(c - expected[i]!)).toBeLessThanOrEqual(tolerance),
  );
};

describe('extractObservation on a synthetic dracula window', () => {
  const W = 920;
  const H = 662;
  const image = paint(W, H, [
    { x: 0, y: 0, w: W, h: H, color: '#282a36' },
    { x: 0, y: 0, w: W, h: 40, color: '#21222c' },
    { x: 0, y: 40, w: 74, h: H - 40 - 40, color: '#343746' },
    { x: 74, y: 40, w: W - 74, h: 56, color: '#191a21' },
    { x: 74, y: 40, w: 230, h: 56, color: '#282a36' },
    { x: 0, y: H - 40, w: W, h: 40, color: '#191a21' },
  ]);
  sprinkleText(image, 120, 800, 140, 560, '#f8f8f2');
  const observation = extractObservation(image);

  it('finds the editor background and the foreground ink', () => {
    near(observation.colors.editorBackground, '#282a36');
    near(observation.colors.editorForeground, '#f8f8f2', 12);
  });

  it('finds the activity bar and the status bar', () => {
    near(observation.colors.activityBarBackground, '#343746');
    near(observation.colors.statusBarBackground, '#191a21');
  });

  it('lists the title bar and the tab strip as top strips in order', () => {
    expect(observation.topStrips).toHaveLength(2);
    near(observation.topStrips[0], '#21222c');
    near(observation.topStrips[1], '#191a21');
    expect(observation.layout).toBe('window');
  });
});

describe('extractObservation when the width is not a multiple of the sampling step', () => {
  const W = 1150;
  const H = 828;
  const image = paint(W, H, [
    { x: 0, y: 0, w: W, h: H, color: '#282a36' },
    { x: 0, y: 0, w: W, h: 50, color: '#21222c' },
    { x: 0, y: 50, w: 92, h: H - 50 - 50, color: '#343746' },
    { x: 92, y: 50, w: W - 92, h: 70, color: '#191a21' },
    { x: 0, y: H - 50, w: W, h: 50, color: '#191a21' },
  ]);
  const observation = extractObservation(image);

  it('still reads the activity bar column without shearing the sample grid', () => {
    near(observation.colors.activityBarBackground, '#343746');
    near(observation.colors.statusBarBackground, '#191a21');
    near(observation.colors.editorBackground, '#282a36');
    expect(observation.topStrips).toHaveLength(2);
  });
});

describe('extractObservation on a code-only crop', () => {
  const image = paint(600, 400, [
    { x: 0, y: 0, w: 600, h: 400, color: '#1e1e1e' },
  ]);
  sprinkleText(image, 20, 580, 10, 390, '#d4d4d4');
  const observation = extractObservation(image);

  it('reports only the editor colors and an editor-only layout', () => {
    near(observation.colors.editorBackground, '#1e1e1e');
    expect(observation.colors.activityBarBackground).toBeUndefined();
    expect(observation.colors.statusBarBackground).toBeUndefined();
    expect(observation.topStrips).toEqual([]);
    expect(observation.layout).toBe('editor-only');
  });
});

describe('extractObservation with a single top strip and transparent corners', () => {
  const W = 460;
  const H = 331;
  const image = paint(W, H, [
    { x: 0, y: 0, w: W, h: H, color: '#ffffff' },
    { x: 0, y: 0, w: W, h: 28, color: '#f3f3f3' },
    { x: 0, y: 28, w: 37, h: H - 28 - 20, color: '#2c2c2c' },
    { x: 0, y: H - 20, w: W, h: 20, color: '#007acc' },
  ]);
  for (const [x, y] of [
    [0, 0],
    [W - 1, 0],
    [0, H - 1],
    [W - 1, H - 1],
  ] as const)
    image.data[(y * W + x) * 4 + 3] = 0;
  const observation = extractObservation(image);

  it('keeps the one strip and ignores transparent pixels', () => {
    expect(observation.topStrips).toHaveLength(1);
    near(observation.topStrips[0], '#f3f3f3');
    near(observation.colors.activityBarBackground, '#2c2c2c');
    near(observation.colors.statusBarBackground, '#007acc');
    near(observation.colors.editorBackground, '#ffffff');
  });
});
