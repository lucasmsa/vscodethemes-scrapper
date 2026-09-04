import { useCallback, useEffect, useState } from 'react';
import { imageFromClipboard, imageFromDrop } from '../lib/image.ts';

export function useDropZone(onImage: (file: Blob) => void) {
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const file = imageFromClipboard(event);
      if (file) onImage(file);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [onImage]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setDragging(false), []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDragging(false);
      const file = imageFromDrop(event.nativeEvent);
      if (file) onImage(file);
    },
    [onImage],
  );

  const onPick = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) onImage(file);
      event.target.value = '';
    },
    [onImage],
  );

  return { dragging, onDragOver, onDragLeave, onDrop, onPick };
}
