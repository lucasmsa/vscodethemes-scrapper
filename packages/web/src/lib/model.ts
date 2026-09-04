import * as ort from 'onnxruntime-web/wasm';
import ortRuntimeUrl from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url';
import ortWasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
import type { PixelImage } from '@vscodethemes/shared';
import { preprocess } from './similarity.ts';

export interface GalleryMeta {
  count: number;
  present: number;
  dim: number;
  scale: number;
  input: [number, number];
  order: string;
}

export interface Model {
  session: ort.InferenceSession;
  gallery: Int8Array;
  meta: GalleryMeta;
}

export async function loadModel(baseUrl: string): Promise<Model> {
  ort.env.wasm.wasmPaths = { wasm: ortWasmUrl, mjs: ortRuntimeUrl };
  ort.env.wasm.numThreads = 1;
  const [metaResponse, galleryResponse, session] = await Promise.all([
    fetch(`${baseUrl}model/gallery.json`),
    fetch(`${baseUrl}model/gallery.i8`),
    ort.InferenceSession.create(`${baseUrl}model/embedder.onnx`, {
      executionProviders: ['wasm'],
    }),
  ]);
  if (!metaResponse.ok || !galleryResponse.ok)
    throw new Error('model files missing');
  const meta = (await metaResponse.json()) as GalleryMeta;
  const gallery = new Int8Array(await galleryResponse.arrayBuffer());
  if (gallery.length !== meta.count * meta.dim)
    throw new Error('gallery size mismatch');
  return { session, gallery, meta };
}

export async function embed(
  model: Model,
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
