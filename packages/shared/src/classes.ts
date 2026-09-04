import { PALETTE_FIELDS, type Palette } from './palette.ts';

/** Themes whose 24 colors are identical are one palette class; the matcher cannot tell them apart. */
export function paletteKey(palette: Palette): string {
  return PALETTE_FIELDS.map((field) => palette[field] ?? '-').join('|');
}

export interface PaletteClasses {
  /** Class index per input position. */
  classOf: number[];
  /** Input positions grouped by class, in first-seen order. */
  members: number[][];
}

export function paletteClasses(palettes: Palette[]): PaletteClasses {
  const byKey = new Map<string, number>();
  const classOf: number[] = [];
  const members: number[][] = [];
  palettes.forEach((palette, i) => {
    const key = paletteKey(palette);
    let cls = byKey.get(key);
    if (cls === undefined) {
      cls = members.length;
      byKey.set(key, cls);
      members.push([]);
    }
    classOf.push(cls);
    members[cls]!.push(i);
  });
  return { classOf, members };
}
