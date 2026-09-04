import { preprocess, rankBySimilarity } from './similarity.ts';

describe('preprocess', () => {
  it('produces a channels-first tensor in [0, 1] at the requested size', () => {
    const width = 8;
    const height = 6;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      data[i * 4] = 255;
      data[i * 4 + 1] = 0;
      data[i * 4 + 2] = 128;
      data[i * 4 + 3] = 255;
    }
    const out = preprocess({ width, height, data }, 4, 3);
    expect(out).toHaveLength(3 * 4 * 3);
    expect(out[0]).toBeCloseTo(1, 5);
    expect(out[12]).toBeCloseTo(0, 5);
    expect(out[24]).toBeCloseTo(128 / 255, 5);
  });

  it('averages the source pixels that fall into each output cell', () => {
    const data = new Uint8ClampedArray(2 * 1 * 4);
    data.set([0, 0, 0, 255, 255, 255, 255, 255]);
    const out = preprocess({ width: 2, height: 1, data }, 1, 1);
    expect(out[0]).toBeCloseTo(0.5, 5);
  });
});

describe('rankBySimilarity', () => {
  it('returns the closest gallery rows first with dequantized cosine', () => {
    const dim = 2;
    const gallery = new Int8Array([127, 0, 0, 127, 90, 90]);
    const query = new Float32Array([0.7071, 0.7071]);
    const hits = rankBySimilarity(query, gallery, dim, 127, 2);
    expect(hits[0]?.row).toBe(2);
    expect(hits[0]?.similarity).toBeCloseTo(1, 1);
    expect(hits[1]?.similarity).toBeCloseTo(0.7071, 2);
  });
});
