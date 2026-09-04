import { PALETTE_FIELDS, type Palette } from './palette.ts';
import { paletteClasses, paletteKey } from './classes.ts';

const empty = Object.fromEntries(
  PALETTE_FIELDS.map((f) => [f, null]),
) as Palette;
const a: Palette = {
  ...empty,
  editorBackground: '#282a36',
  statusBarBackground: '#191a21',
};
const b: Palette = {
  ...empty,
  editorBackground: '#282a36',
  statusBarBackground: '#191a21',
};
const c: Palette = {
  ...empty,
  editorBackground: '#282a36',
  statusBarBackground: '#191a22',
};

describe('palette classes', () => {
  it('keys a palette by all 24 fields with null spelled out', () => {
    expect(paletteKey(a)).toBe(paletteKey(b));
    expect(paletteKey(a)).not.toBe(paletteKey(c));
    expect(paletteKey(empty).split('|')).toHaveLength(PALETTE_FIELDS.length);
  });

  it('groups identical palettes and keeps first-seen class order', () => {
    const classes = paletteClasses([a, c, b]);
    expect(classes.classOf).toEqual([0, 1, 0]);
    expect(classes.members).toEqual([[0, 2], [1]]);
  });
});
