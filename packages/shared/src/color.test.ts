import {
  deltaE,
  hexToRgb,
  rgbToHex,
  rgbToLab,
  relativeLuminance,
  contrastRatio,
} from './color.ts';

describe('hex parsing', () => {
  it('parses 6 and 8 digit hex, ignoring alpha', () => {
    expect(hexToRgb('#282a36')).toEqual([40, 42, 54]);
    expect(hexToRgb('#282A36FF')).toEqual([40, 42, 54]);
  });

  it('parses 3 digit hex', () => {
    expect(hexToRgb('#fff')).toEqual([255, 255, 255]);
  });

  it('round-trips to lowercase hex', () => {
    expect(rgbToHex([40, 42, 54])).toBe('#282a36');
  });
});

describe('rgbToLab (D65, CIE 1976)', () => {
  it('maps white to L 100 and black to L 0', () => {
    const [lw, aw, bw] = rgbToLab([255, 255, 255]);
    expect(lw).toBeCloseTo(100, 1);
    expect(Math.abs(aw)).toBeLessThan(0.05);
    expect(Math.abs(bw)).toBeLessThan(0.05);
    expect(rgbToLab([0, 0, 0])[0]).toBeCloseTo(0, 5);
  });

  it('matches the reference values for pure red', () => {
    const [l, a, b] = rgbToLab([255, 0, 0]);
    expect(l).toBeCloseTo(53.24, 1);
    expect(a).toBeCloseTo(80.09, 1);
    expect(b).toBeCloseTo(67.2, 1);
  });
});

describe('deltaE', () => {
  it('is zero for identical colors and symmetric', () => {
    const a = rgbToLab([40, 42, 54]);
    const b = rgbToLab([25, 26, 33]);
    expect(deltaE(a, a)).toBe(0);
    expect(deltaE(a, b)).toBeCloseTo(deltaE(b, a), 10);
  });

  it('ranks a near color below a far color', () => {
    const base = rgbToLab([40, 42, 54]);
    expect(deltaE(base, rgbToLab([42, 44, 56]))).toBeLessThan(
      deltaE(base, rgbToLab([255, 255, 255])),
    );
  });
});

describe('contrast', () => {
  it('computes WCAG relative luminance and ratio', () => {
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 5);
    expect(relativeLuminance([0, 0, 0])).toBeCloseTo(0, 5);
    expect(contrastRatio([255, 255, 255], [0, 0, 0])).toBeCloseTo(21, 2);
    expect(contrastRatio([248, 248, 242], [40, 42, 54])).toBeGreaterThan(12);
  });
});
