import { existsSync } from 'node:fs';
import { renderAsync, type ResvgRenderOptions } from '@resvg/resvg-js';
import sharp from 'sharp';
import type { PreviewLanguage } from '@vscodethemes/shared';

export type CropKind = 'window' | 'partial' | 'editor';

export const CROP_KINDS: CropKind[] = ['window', 'partial', 'editor'];

export interface QuerySpec {
  id: string;
  language: PreviewLanguage;
  crop: CropKind;
  zoom: number;
  quality: number;
  file: string;
}

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PREVIEW = {
  width: 460,
  height: 331,
  title: 20,
  tabs: 48,
  activityBar: 37,
  status: 311,
};

function cropBox(kind: CropKind, zoom: number, random: () => number) {
  const w = PREVIEW.width * zoom;
  const h = PREVIEW.height * zoom;
  if (kind === 'window')
    return { left: 0, top: 0, width: Math.round(w), height: Math.round(h) };
  if (kind === 'editor') {
    const left = (PREVIEW.activityBar + 8 + random() * 60) * zoom;
    const top = (PREVIEW.tabs + 8 + random() * 60) * zoom;
    const right = (PREVIEW.width - 8 - random() * 40) * zoom;
    const bottom = (PREVIEW.status - 8 - random() * 40) * zoom;
    return {
      left: Math.round(left),
      top: Math.round(top),
      width: Math.round(right - left),
      height: Math.round(bottom - top),
    };
  }
  const keepLeft = random() < 0.5;
  const keepBottom = random() < 0.5;
  const width = Math.round(w * (0.6 + random() * 0.35));
  const height = Math.round(h * (0.6 + random() * 0.35));
  return {
    left: keepLeft ? 0 : Math.round(w) - width,
    top: keepBottom ? Math.round(h) - height : 0,
    width,
    height,
  };
}

/**
 * Loading every system font is what makes resvg slow (about 250 ms per render on macOS);
 * two explicit files render the same SVG in about 20 ms. WIMT_FONT_FILES overrides the list.
 */
const DEFAULT_FONT_FILES = [
  '/System/Library/Fonts/Menlo.ttc',
  '/System/Library/Fonts/Helvetica.ttc',
];

export function fontOptions(): NonNullable<ResvgRenderOptions['font']> {
  const files = (
    process.env.WIMT_FONT_FILES?.split(',') ?? DEFAULT_FONT_FILES
  ).filter((f) => existsSync(f));
  if (files.length === 0) return { loadSystemFonts: true };
  return {
    loadSystemFonts: false,
    fontFiles: files,
    defaultFontFamily: 'Helvetica',
    monospaceFamily: 'Menlo',
    sansSerifFamily: 'Helvetica',
  };
}

const FONT = fontOptions();

export async function renderSvgPng(svg: string, zoom: number): Promise<Buffer> {
  const image = await renderAsync(svg, {
    fitTo: { mode: 'zoom', value: zoom },
    font: FONT,
  });
  return image.asPng();
}

export async function renderQuery(
  svg: string,
  spec: Omit<QuerySpec, 'file'>,
  random: () => number,
): Promise<Buffer> {
  const png = await renderSvgPng(svg, spec.zoom);
  const box = cropBox(spec.crop, spec.zoom, random);
  return sharp(png)
    .flatten({ background: '#000000' })
    .extract(box)
    .jpeg({ quality: spec.quality })
    .toBuffer();
}

export async function decodeToPixels(image: Buffer) {
  const { data, info } = await sharp(image)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    width: info.width,
    height: info.height,
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length),
  };
}

export function sample<T>(items: T[], n: number, random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy.slice(0, n);
}
