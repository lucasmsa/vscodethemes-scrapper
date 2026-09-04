import type { ChangeEvent, DragEvent } from 'react';

interface DropZoneProps {
  dragging: boolean;
  busy: boolean;
  loading: boolean;
  themes: number;
  onDragOver: (event: DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent) => void;
  onPick: (event: ChangeEvent<HTMLInputElement>) => void;
}

function label({
  loading,
  busy,
  themes,
}: {
  loading: boolean;
  busy: boolean;
  themes: number;
}) {
  if (loading) return themes ? 'loading the model...' : 'loading themes...';
  if (busy) return 'reading pixels...';
  return 'drop a screenshot of your editor here';
}

export function DropZone({
  dragging,
  busy,
  loading,
  themes,
  onDragOver,
  onDragLeave,
  onDrop,
  onPick,
}: DropZoneProps) {
  return (
    <div
      className={`dropzone ${dragging ? 'dropzone--dragging' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <label className="dropzone__label" htmlFor="screenshot">
        <span>{label({ loading, busy, themes })}</span>
        <span className="dropzone__hint">
          or paste one with <kbd>⌘V</kbd> / <kbd>Ctrl+V</kbd>, or click to pick
          a file
        </span>
      </label>
      <input
        id="screenshot"
        className="file-input"
        type="file"
        accept="image/*"
        data-testid="file-input"
        onChange={onPick}
        disabled={busy}
      />
    </div>
  );
}
