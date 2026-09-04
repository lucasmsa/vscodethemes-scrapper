import type { PixelImage } from '@vscodethemes/shared';

const MAX_DECODE_WIDTH = 1600;

export async function fileToPixels(
  file: Blob,
): Promise<{ pixels: PixelImage; previewUrl: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DECODE_WIDTH / bitmap.width);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2d canvas unavailable');
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const { data } = context.getImageData(0, 0, width, height);
  return {
    pixels: { width, height, data },
    previewUrl: URL.createObjectURL(file),
  };
}

export function imageFromClipboard(event: ClipboardEvent): File | null {
  for (const item of event.clipboardData?.items ?? []) {
    if (item.type.startsWith('image/')) return item.getAsFile();
  }
  return null;
}

export function imageFromDrop(event: DragEvent): File | null {
  const file = event.dataTransfer?.files[0];
  return file && file.type.startsWith('image/') ? file : null;
}
