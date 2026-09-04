import type { PixelImage } from '@vscodethemes/shared';

/**
 * Box-filter resize to the trainer's input size, RGB in [0, 1], channels first.
 * Mirrors model/wimt/data.py to_tensor (PIL's bilinear downscale averages source pixels too).
 */
export function preprocess(
  image: PixelImage,
  width: number,
  height: number,
): Float32Array {
  const out = new Float32Array(3 * width * height);
  const plane = width * height;
  for (let y = 0; y < height; y++) {
    const y0 = Math.floor((y * image.height) / height);
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * image.height) / height));
    for (let x = 0; x < width; x++) {
      const x0 = Math.floor((x * image.width) / width);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * image.width) / width));
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const i = (sy * image.width + sx) * 4;
          r += image.data[i]!;
          g += image.data[i + 1]!;
          b += image.data[i + 2]!;
          n++;
        }
      }
      const o = y * width + x;
      out[o] = r / n / 255;
      out[plane + o] = g / n / 255;
      out[2 * plane + o] = b / n / 255;
    }
  }
  return out;
}

export interface SimilarityHit {
  row: number;
  similarity: number;
}

/** Cosine against an int8 gallery (unit vectors scaled by `scale`), keeping the top k. */
export function rankBySimilarity(
  embedding: Float32Array,
  gallery: Int8Array,
  dim: number,
  scale: number,
  k: number,
): SimilarityHit[] {
  const count = gallery.length / dim;
  const hits: SimilarityHit[] = [];
  for (let row = 0; row < count; row++) {
    const base = row * dim;
    let dot = 0;
    for (let d = 0; d < dim; d++) dot += embedding[d]! * gallery[base + d]!;
    const similarity = dot / scale;
    if (hits.length < k) {
      hits.push({ row, similarity });
      hits.sort((a, b) => b.similarity - a.similarity);
    } else if (similarity > hits[k - 1]!.similarity) {
      hits[k - 1] = { row, similarity };
      hits.sort((a, b) => b.similarity - a.similarity);
    }
  }
  return hits;
}
