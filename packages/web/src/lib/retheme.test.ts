import {
  PALETTE_FIELDS,
  contrastRatio,
  hexToRgb,
  type Palette,
} from '@vscodethemes/shared';
import { pageThemeFromPalette } from './retheme.ts';

const empty = Object.fromEntries(
  PALETTE_FIELDS.map((f) => [f, null]),
) as Palette;

describe('pageThemeFromPalette', () => {
  it('takes the theme colors when they already pass AA', () => {
    const theme = pageThemeFromPalette({
      ...empty,
      editorBackground: '#282a36',
      editorForeground: '#f8f8f2',
      statusBarBackground: '#191a21',
      statusBarForeground: '#f8f8f2',
      activityBarBackground: '#343746',
      activityBarBadgeBackground: '#ff79c6',
    });
    expect(theme['--page-bg']).toBe('#282a36');
    expect(theme['--page-fg']).toBe('#f8f8f2');
    expect(theme['--status-fg']).toBe('#f8f8f2');
    expect(theme['--accent']).toBe('#ff79c6');
  });

  it('replaces a low-contrast foreground with one that passes 4.5:1', () => {
    const theme = pageThemeFromPalette({
      ...empty,
      editorBackground: '#282a36',
      editorForeground: '#3a3c4a',
    });
    const ratio = contrastRatio(
      hexToRgb(theme['--page-bg']),
      hexToRgb(theme['--page-fg']),
    );
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('derives a secondary foreground that still passes AA', () => {
    const theme = pageThemeFromPalette({
      ...empty,
      editorBackground: '#282a36',
      editorForeground: '#f8f8f2',
    });
    expect(theme['--page-fg-2']).not.toBe(theme['--page-fg']);
    expect(
      contrastRatio(
        hexToRgb(theme['--page-bg']),
        hexToRgb(theme['--page-fg-2']),
      ),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('falls back to workbench defaults for unset chrome colors', () => {
    const theme = pageThemeFromPalette({
      ...empty,
      editorBackground: '#ffffff',
    });
    expect(theme['--status-bg']).toBe('#007acc');
    expect(
      contrastRatio(hexToRgb('#007acc'), hexToRgb(theme['--status-fg'])),
    ).toBeGreaterThanOrEqual(4.5);
  });
});
