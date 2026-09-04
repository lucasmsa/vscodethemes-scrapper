import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const target = join(dirname(fileURLToPath(import.meta.url)), '../public/ort');
mkdirSync(target, { recursive: true });
for (const file of ['ort-wasm-simd-threaded.wasm', 'ort-wasm-simd-threaded.mjs']) {
  copyFileSync(require.resolve(`onnxruntime-web/${file}`), join(target, file));
}
console.log(`copied onnxruntime-web wasm runtime to ${target}`);
