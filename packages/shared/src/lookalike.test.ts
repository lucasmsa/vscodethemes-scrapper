import { PALETTE_FIELDS, type Palette } from './palette.ts';
import type { IndexedTheme } from './themeIndex.ts';
import { classMembersIndex } from './collapse.ts';
import { LOOKALIKE_BAND, popularLookalike } from './lookalike.ts';

const empty = Object.fromEntries(
  PALETTE_FIELDS.map((f) => [f, null]),
) as Palette;

const BASE: Partial<Palette> = {
  editorBackground: '#1e1e2e',
  activityBarBackground: '#181825',
  statusBarBackground: '#181825',
  titleBarActiveBackground: '#11111b',
  tabsContainerBackground: '#181825',
};

const make = (
  id: string,
  paletteClass: number,
  rank: number,
  colors: Partial<Palette> = {},
): IndexedTheme => ({
  id,
  displayName: id,
  extensionDisplayName: 'ext',
  preview: `https://images.vscodethemes.com/${id}-js-preview-AAAA.svg`,
  rank,
  paletteClass,
  palette: { ...empty, ...BASE, ...colors },
});

const obscure = make('obscure', 0, 9000);
const famous = make('famous', 1, 12);
const twin = make('twin', 1, 4000);
// 1.61 weighted delta E from the base palette, inside the band.
const nearby = make('nearby', 4, 5, { editorBackground: '#282838' });
// 3.05 weighted delta E from the base palette, outside it.
const distant = make('distant', 2, 1, { editorBackground: '#303045' });
const unranked = make('unranked', 3, 0);
const membersOf = classMembersIndex([
  obscure,
  famous,
  twin,
  nearby,
  distant,
  unranked,
]);

describe('popularLookalike', () => {
  it('names the most installed theme whose palette sits inside the band', () => {
    const readout = popularLookalike(
      [
        { theme: obscure, distance: 1 },
        { theme: famous, distance: 2 },
      ],
      membersOf,
    );
    expect(readout?.theme.id).toBe('famous');
    expect(readout?.score.distance).toBe(2);
    expect(readout?.apart).toBe(0);
    expect(readout?.considered).toBe(2);
  });

  it('says nothing when the first result is already the most installed', () => {
    expect(
      popularLookalike(
        [
          { theme: famous, distance: 1 },
          { theme: obscure, distance: 2 },
        ],
        membersOf,
      ),
    ).toBeNull();
  });

  it('says nothing when the more installed theme is only an identical palette, because the first result already carries it', () => {
    expect(
      popularLookalike(
        [
          { theme: twin, distance: 1 },
          { theme: famous, distance: 1.5 },
        ],
        membersOf,
      ),
    ).toBeNull();
  });

  it('takes a theme whose palette differs but stays inside the band', () => {
    const readout = popularLookalike(
      [
        { theme: obscure, distance: 1 },
        { theme: nearby, distance: 2 },
      ],
      membersOf,
    );
    expect(readout?.theme.id).toBe('nearby');
    expect(readout?.apart).toBeCloseTo(1.61, 2);
  });

  it('leaves out a theme whose palette sits further than the band, however popular', () => {
    const ranked = [
      { theme: obscure, distance: 1 },
      { theme: distant, distance: 1 },
    ];
    expect(popularLookalike(ranked, membersOf)).toBeNull();
    const wider = popularLookalike(ranked, membersOf, 5);
    expect(wider?.theme.id).toBe('distant');
    expect(wider?.considered).toBe(2);
    expect(wider?.apart).toBeCloseTo(3.05, 2);
  });

  it('counts only the candidates the band admitted', () => {
    const readout = popularLookalike(
      [
        { theme: obscure, distance: 1 },
        { theme: famous, distance: 2 },
        { theme: distant, distance: 3 },
      ],
      membersOf,
      LOOKALIKE_BAND,
    );
    expect(readout?.considered).toBe(2);
  });

  it('never promotes a theme whose installs rank the crawl did not report', () => {
    expect(
      popularLookalike(
        [
          { theme: obscure, distance: 1 },
          { theme: unranked, distance: 1 },
        ],
        membersOf,
      ),
    ).toBeNull();
  });

  it('says nothing without a ranking, or when no color field could be compared', () => {
    expect(popularLookalike([], membersOf)).toBeNull();
    expect(
      popularLookalike(
        [
          { theme: obscure, distance: Number.POSITIVE_INFINITY },
          { theme: famous, distance: Number.POSITIVE_INFINITY },
        ],
        membersOf,
      ),
    ).toBeNull();
  });
});
