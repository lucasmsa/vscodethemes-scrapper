import { PALETTE_FIELDS, type Palette } from './palette.ts';
import type { IndexedTheme } from './themeIndex.ts';
import { classMembersIndex, collapseToClasses } from './collapse.ts';

const empty = Object.fromEntries(
  PALETTE_FIELDS.map((f) => [f, null]),
) as Palette;
const make = (
  id: string,
  paletteClass: number,
  rank: number,
): IndexedTheme => ({
  id,
  displayName: id,
  extensionDisplayName: 'ext',
  preview: 'https://images.vscodethemes.com/x.y/t-js-preview-AAAA.svg',
  rank,
  paletteClass,
  palette: empty,
});

const clone = make('clone', 0, 900);
const dracula = make('dracula', 0, 3);
const soft = make('soft', 1, 3);
const other = make('other', 2, 50);
const membersOf = classMembersIndex([clone, dracula, soft, other]);

describe('collapseToClasses', () => {
  it('merges same-class hits, names the class after its best-ranked member and lists the rest', () => {
    const ranked = [
      { theme: clone, distance: 0 },
      { theme: dracula, distance: 0 },
      { theme: soft, distance: 1 },
      { theme: other, distance: 5 },
    ];
    const classes = collapseToClasses(ranked, membersOf, 5);
    expect(classes.map((c) => c.theme.id)).toEqual([
      'dracula',
      'soft',
      'other',
    ]);
    expect(classes[0]?.identical.map((t) => t.id)).toEqual(['clone']);
    expect(classes[1]?.identical).toEqual([]);
    expect(classes[0]?.score.distance).toBe(0);
  });

  it('stops after k classes', () => {
    const ranked = [{ theme: clone }, { theme: soft }, { theme: other }];
    expect(collapseToClasses(ranked, membersOf, 2)).toHaveLength(2);
  });
});
