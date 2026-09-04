/**
 * Runs the exported model the way the browser does: the ONNX graph plus the web package's
 * own preprocessing and int8 gallery reader. Scoring the same queries through this path is how
 * we check that what ships matches what model/ measured.
 */
import { readFile } from 'node:fs/promises';
import * as ort from 'onnxruntime-node';
import type { PixelImage } from '@vscodethemes/shared';
import { preprocess } from '../../web/src/lib/similarity.ts';

export interface GalleryMeta {
  count: number;
  present: number;
  dim: number;
  scale: number;
  input: [number, number];
  trainedClasses?: number;
  epochs?: number;
}

export interface OnnxModel {
  session: ort.InferenceSession;
  gallery: Int8Array;
  meta: GalleryMeta;
}

export async function loadOnnxModel(dir: string): Promise<OnnxModel> {
  const meta = JSON.parse(
    await readFile(`${dir}/gallery.json`, 'utf8'),
  ) as GalleryMeta;
  const galleryBuffer = await readFile(`${dir}/gallery.i8`);
  const gallery = new Int8Array(
    galleryBuffer.buffer,
    galleryBuffer.byteOffset,
    galleryBuffer.length,
  );
  const session = await ort.InferenceSession.create(`${dir}/embedder.onnx`);
  if (gallery.length !== meta.count * meta.dim)
    throw new Error('gallery size mismatch');
  return { session, gallery, meta };
}

export async function embedWithOnnx(
  model: OnnxModel,
  image: PixelImage,
): Promise<Float32Array> {
  const [width, height] = model.meta.input;
  const input = new ort.Tensor('float32', preprocess(image, width, height), [
    1,
    3,
    height,
    width,
  ]);
  const output = await model.session.run({ image: input });
  return output.embedding!.data as Float32Array;
}
