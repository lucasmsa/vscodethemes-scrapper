import { PALETTE_FIELDS } from './palette.ts';
import type { Palette } from './palette.ts';
import { deltaE, hexToLab, hexToRgb } from './color.ts';
import type { Observation } from './extract.ts';
import type { IndexedTheme } from './themeIndex.ts';
import {
  paletteDistance,
  prepareThemes,
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
