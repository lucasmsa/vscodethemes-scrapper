export type Rgb = readonly [number, number, number];
export type Lab = readonly [number, number, number];

export function hexToRgb(hex: string): Rgb {
  let digits = hex.replace('#', '');
  if (digits.length === 3) {
    digits = digits
      .split('')
      .map((d) => d + d)
      .join('');
  }
  const value = parseInt(digits.slice(0, 6), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function rgbToHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
}

function linearize(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

const D65 = { x: 0.95047, y: 1.0, z: 1.08883 };

function labF(t: number): number {
  const delta = 6 / 29;
  return t > delta ** 3 ? Math.cbrt(t) : t / (3 * delta * delta) + 4 / 29;
}

export function rgbToLab(rgb: Rgb): Lab {
  const [r, g, b] = rgb.map(linearize) as [number, number, number];
  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / D65.x;
  const y = (r * 0.2126729 + g * 0.7151522 + b * 0.072175) / D65.y;
  const z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) / D65.z;
  const fx = labF(x);
  const fy = labF(y);
  const fz = labF(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function hexToLab(hex: string): Lab {
  return rgbToLab(hexToRgb(hex));
}

export function deltaE(a: Lab, b: Lab): number {
  const dl = a[0] - b[0];
  const da = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dl * dl + da * da + db * db);
}

export function relativeLuminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map(linearize) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la > lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}
