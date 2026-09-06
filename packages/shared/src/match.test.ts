import { PALETTE_FIELDS } from './palette.ts';
import type { Palette } from './palette.ts';
import { deltaE, hexToLab, hexToRgb } from './color.ts';
import type { Observation } from './extract.ts';
import type { IndexedTheme } from './themeIndex.ts';
import {
  NO_RANK_PRIOR,
  orderByScore,
  paletteDistance,
  WORST_INSTALLS_RANK,
  prepareThemes,
  rankPenalty,
  rankPriorOfStrength,
  rankThemes,
  resolvedColor,
  themeKind,
} from './match.ts';

const empty = Object.fromEntries(
  PALETTE_FIELDS.map((f) => [f, null]),
) as Palette;

const make = (
  id: string,
  colors: Partial<Palette>,
  rank = 0,
): IndexedTheme => ({
  id,
  displayName: id,
  extensionDisplayName: 'ext',
  preview: `https://images.vscodethemes.com/${id}-js-preview-AAAA.svg`,
  rank,
  paletteClass: 0,
  palette: { ...empty, ...colors },
});

const dracula = make('dracula', {
  editorBackground: '#282a36',
  editorForeground: '#f8f8f2',
  activityBarBackground: '#343746',
  statusBarBackground: '#191a21',
  titleBarActiveBackground: '#21222c',
  tabsContainerBackground: '#191a21',
});
const draculaSoft = make('dracula-soft', {
  editorBackground: '#282a36',
  editorForeground: '#f6f6f4',
  activityBarBackground: '#343746',
  statusBarBackground: '#191a21',
  titleBarActiveBackground: '#21222c',
  tabsContainerBackground: '#191a21',
});
const oneDark = make('one-dark', {
  editorBackground: '#282c34',
  editorForeground: '#abb2bf',
  activityBarBackground: '#282c34',
  statusBarBackground: '#21252b',
  titleBarActiveBackground: '#282c34',
  tabsContainerBackground: '#21252b',
});
const light = make('light', { editorBackground: '#ffffff' });
const draculaClone = make('a-clone-of-dracula', { ...dracula.palette }, 900);
const rankedDracula = { ...dracula, rank: 3 };

const prepared = prepareThemes([oneDark, draculaSoft, dracula, light]);
const withClone = prepareThemes([draculaClone, rankedDracula, oneDark]);

describe('themeKind and defaults', () => {
  it('classifies by editor background lightness', () => {
    expect(themeKind(dracula.palette)).toBe('dark');
    expect(themeKind(light.palette)).toBe('light');
  });

  it('falls back to the workbench default when a color is unset', () => {
    expect(resolvedColor(light.palette, 'statusBarBackground')).toBe('#007acc');
    expect(resolvedColor(dracula.palette, 'statusBarBackground')).toBe(
      '#191a21',
    );
    expect(resolvedColor(light.palette, 'tabBorder')).toBeNull();
  });
});

describe('paletteDistance', () => {
  it('is zero between a theme and itself', () => {
    expect(paletteDistance(dracula.palette, dracula.palette)).toBe(0);
  });

  it('ignores colors the ranking does not weigh, so a foreground-only variant is the same look', () => {
    expect(paletteDistance(dracula.palette, draculaSoft.palette)).toBe(0);
  });

  it('charges an editor background on its own three ninths of the weight', () => {
    const shifted = make('shifted', {
      ...dracula.palette,
      editorBackground: '#303045',
    });
    expect(paletteDistance(dracula.palette, shifted.palette)).toBeCloseTo(
      (3 / 9) * deltaE(hexToLab('#282a36'), hexToLab('#303045')),
      10,
    );
  });

  it('fills unset colors with the workbench defaults instead of skipping them', () => {
    const bare = make('bare', { editorBackground: '#ffffff' });
    const spelled = make('spelled', {
      editorBackground: '#ffffff',
      activityBarBackground: '#2c2c2c',
      statusBarBackground: '#007acc',
      titleBarActiveBackground: '#dddddd',
      tabsContainerBackground: '#f3f3f3',
    });
    expect(paletteDistance(bare.palette, spelled.palette)).toBe(0);
  });

  it('is symmetric', () => {
    expect(paletteDistance(dracula.palette, oneDark.palette)).toBe(
      paletteDistance(oneDark.palette, dracula.palette),
    );
  });
});

describe('rankThemes', () => {
  const fullWindow: Observation = {
    colors: {
      editorBackground: hexToRgb('#282a36'),
      editorForeground: hexToRgb('#f8f8f2'),
      activityBarBackground: hexToRgb('#343746'),
      statusBarBackground: hexToRgb('#191a21'),
    },
    topStrips: [hexToRgb('#21222c'), hexToRgb('#191a21')],
    layout: 'window',
  };

  it('puts the exact theme first with distance zero and its sibling second', () => {
    const [first, second, third] = rankThemes(fullWindow, prepared, 3);
    expect(first?.theme.id).toBe('dracula');
    expect(first?.distance).toBe(0);
    expect(second?.theme.id).toBe('dracula-soft');
    expect(third?.theme.id).toBe('one-dark');
    expect(first?.fields).toContain('titleBarActiveBackground');
  });

  it('breaks exact ties by installs rank, not by name', () => {
    const [first, second] = rankThemes(fullWindow, withClone, 2);
    expect(first?.theme.id).toBe('dracula');
    expect(second?.theme.id).toBe('a-clone-of-dracula');
    expect(first?.distance).toBe(second?.distance);
  });

  it('still ranks on editor colors alone for a code-only crop', () => {
    const crop: Observation = {
      colors: {
        editorBackground: hexToRgb('#282c34'),
        editorForeground: hexToRgb('#abb2bf'),
      },
      topStrips: [],
      layout: 'editor-only',
    };
    const [first] = rankThemes(crop, prepared, 1);
    expect(first?.theme.id).toBe('one-dark');
    expect(first?.fields).toEqual(['editorBackground']);
  });

  it('matches a single top strip against either title bar or tab strip', () => {
    const oneStrip: Observation = {
      colors: { editorBackground: hexToRgb('#282a36') },
      topStrips: [hexToRgb('#191a21')],
      layout: 'window',
    };
    const [first] = rankThemes(oneStrip, prepared, 1);
    expect(first?.theme.id).toBe('dracula');
    expect(first?.distance).toBe(0);
  });

  it('uses workbench defaults for unset colors instead of skipping them', () => {
    const lightWindow: Observation = {
      colors: {
        editorBackground: hexToRgb('#ffffff'),
        statusBarBackground: hexToRgb('#007acc'),
      },
      topStrips: [],
      layout: 'window',
    };
    const [first] = rankThemes(lightWindow, prepared, 1);
    expect(first?.theme.id).toBe('light');
    expect(first?.distance).toBe(0);
  });
});

describe('rankPenalty', () => {
  const prior = rankPriorOfStrength(2);

  it('charges nothing at rank 1 and the full strength at the worst rank', () => {
    expect(rankPenalty(1, prior)).toBe(0);
    expect(rankPenalty(WORST_INSTALLS_RANK, prior)).toBeCloseTo(2, 10);
  });

  it('grows with log10(rank), so rank 126 costs about half of a rank 15,876', () => {
    expect(rankPenalty(126, prior)).toBeCloseTo(1, 1);
    expect(rankPenalty(100, prior)).toBeLessThan(rankPenalty(1000, prior));
    expect(rankPenalty(1000, prior)).toBeLessThan(rankPenalty(10000, prior));
  });

  it('charges an unknown rank (0) and anything past the worst rank the full strength', () => {
    expect(rankPenalty(0, prior)).toBeCloseTo(2, 10);
    expect(rankPenalty(99999, prior)).toBeCloseTo(2, 10);
  });

  it('is inert at strength 0, whatever the rank', () => {
    expect(rankPenalty(1, NO_RANK_PRIOR)).toBe(0);
    expect(rankPenalty(0, NO_RANK_PRIOR)).toBe(0);
    expect(rankPenalty(9000, NO_RANK_PRIOR)).toBe(0);
  });
});

describe('orderByScore', () => {
  const popular = make('popular', {}, 5);
  const obscure = make('obscure', {}, 12000);

  it('leaves the color order alone at strength 0', () => {
    const ordered = orderByScore([
      { theme: popular, distance: 4 },
      { theme: obscure, distance: 1 },
    ]);
    expect(ordered.map((m) => m.theme.id)).toEqual(['obscure', 'popular']);
  });

  it('lifts the more installed theme over an equally distant obscure one', () => {
    const ordered = orderByScore(
      [
        { theme: obscure, distance: 1 },
        { theme: popular, distance: 1 },
      ],
      rankPriorOfStrength(1),
    );
    expect(ordered.map((m) => m.theme.id)).toEqual(['popular', 'obscure']);
  });

  it('does not let a weak prior overturn a color difference it cannot pay for', () => {
    const ordered = orderByScore(
      [
        { theme: popular, distance: 4 },
        { theme: obscure, distance: 1 },
      ],
      rankPriorOfStrength(1),
    );
    expect(ordered.map((m) => m.theme.id)).toEqual(['obscure', 'popular']);
  });

  it('overturns a 3 delta E gap once the prior is charged 10', () => {
    const ordered = orderByScore(
      [
        { theme: popular, distance: 4 },
        { theme: obscure, distance: 1 },
      ],
      rankPriorOfStrength(10),
    );
    expect(ordered.map((m) => m.theme.id)).toEqual(['popular', 'obscure']);
  });

  it('leaves an exact color tie to model similarity, not to installs', () => {
    const ordered = orderByScore([
      { theme: popular, distance: 1, similarity: 0.4 },
      { theme: obscure, distance: 1, similarity: 0.9 },
    ]);
    expect(ordered.map((m) => m.theme.id)).toEqual(['obscure', 'popular']);
  });
});

describe('rankThemes with a prior', () => {
  const fullWindow: Observation = {
    colors: {
      editorBackground: hexToRgb('#282a36'),
      editorForeground: hexToRgb('#f8f8f2'),
      activityBarBackground: hexToRgb('#343746'),
      statusBarBackground: hexToRgb('#191a21'),
    },
    topStrips: [hexToRgb('#21222c'), hexToRgb('#191a21')],
    layout: 'window',
  };

  it('keeps the exact match first: rank 3 pays less than rank 900 at the same distance', () => {
    const [first, second] = rankThemes(
      fullWindow,
      withClone,
      2,
      rankPriorOfStrength(2),
    );
    expect(first?.theme.id).toBe('dracula');
    expect(second?.theme.id).toBe('a-clone-of-dracula');
  });

  it('reports the color distance, not the prior-adjusted score', () => {
    const [first] = rankThemes(
      fullWindow,
      withClone,
      1,
      rankPriorOfStrength(5),
    );
    expect(first?.distance).toBe(0);
  });
});
