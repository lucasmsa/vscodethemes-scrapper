import {
  contrastRatio,
  hexToRgb,
  rgbToHex,
  resolvedColor,
  type Palette,
  type Rgb,
} from '@vscodethemes/shared';

export interface PageTheme {
  '--page-bg': string;
  '--page-fg': string;
  '--page-fg-2': string;
  '--chrome-bg': string;
  '--chrome-fg': string;
  '--rail-bg': string;
  '--rail-fg': string;
  '--status-bg': string;
  '--status-fg': string;
  '--tabs-bg': string;
  '--accent': string;
}

const AA_BODY = 4.5;

function readable(
  background: Rgb,
  preferred: Rgb | null,
  fallbacks: Rgb[],
): Rgb {
  const candidates = [preferred, ...fallbacks].filter(
    (c): c is Rgb => c !== null,
  );
  const passing = candidates.find(
    (c) => contrastRatio(background, c) >= AA_BODY,
  );
  if (passing) return passing;
  return contrastRatio(background, [255, 255, 255]) >=
    contrastRatio(background, [0, 0, 0])
    ? [255, 255, 255]
    : [0, 0, 0];
}

const rgb = (hex: string | null) => (hex ? hexToRgb(hex) : null);

function mix(a: Rgb, b: Rgb, amount: number): Rgb {
  return [0, 1, 2].map((i) =>
    Math.round(a[i]! * (1 - amount) + b[i]! * amount),
  ) as unknown as Rgb;
}

/** A quieter foreground that still clears AA against the page background. */
function secondary(background: Rgb, foreground: Rgb): Rgb {
  for (const amount of [0.3, 0.2, 0.1]) {
    const candidate = mix(foreground, background, amount);
    if (contrastRatio(background, candidate) >= AA_BODY) return candidate;
  }
  return foreground;
}

export function pageThemeFromPalette(palette: Palette): PageTheme {
  const editorBg = rgb(resolvedColor(palette, 'editorBackground')) ?? [
    30, 30, 30,
  ];
  const editorFg = rgb(resolvedColor(palette, 'editorForeground'));
  const titleBg =
    rgb(resolvedColor(palette, 'titleBarActiveBackground')) ?? editorBg;
  const titleFg = rgb(palette.titleBarActiveForeground);
  const railBg =
    rgb(resolvedColor(palette, 'activityBarBackground')) ?? editorBg;
  const railFg = rgb(palette.activityBarForeground);
  const statusBg =
    rgb(resolvedColor(palette, 'statusBarBackground')) ?? editorBg;
  const statusFg = rgb(palette.statusBarForeground);
  const tabsBg =
    rgb(resolvedColor(palette, 'tabsContainerBackground')) ?? titleBg;
  const accent =
    rgb(palette.activityBarBadgeBackground) ??
    rgb(palette.tabActiveBorderTop) ??
    rgb(palette.activityBarActiveBorder);

  const pageFg = readable(editorBg, editorFg, []);
  return {
    '--page-bg': rgbToHex(editorBg),
    '--page-fg': rgbToHex(pageFg),
    '--page-fg-2': rgbToHex(secondary(editorBg, pageFg)),
    '--chrome-bg': rgbToHex(titleBg),
    '--chrome-fg': rgbToHex(readable(titleBg, titleFg, [pageFg])),
    '--rail-bg': rgbToHex(railBg),
    '--rail-fg': rgbToHex(readable(railBg, railFg, [pageFg])),
    '--status-bg': rgbToHex(statusBg),
    '--status-fg': rgbToHex(readable(statusBg, statusFg, [pageFg])),
    '--tabs-bg': rgbToHex(tabsBg),
    '--accent': rgbToHex(accent ?? readable(editorBg, null, [])),
  };
}

export function applyPageTheme(
  theme: PageTheme,
  root: HTMLElement = document.documentElement,
): void {
  for (const [name, value] of Object.entries(theme))
    root.style.setProperty(name, value);
}
