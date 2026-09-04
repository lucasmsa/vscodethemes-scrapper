import { deltaE, hexToLab, rgbToLab, type Lab } from './color.ts';
import type { Observation } from './extract.ts';
import type { IndexedTheme } from './themeIndex.ts';
import type { Hex, Palette } from './palette.ts';

export interface Match {
  theme: IndexedTheme;
  distance: number;
  fields: string[];
}

const WEIGHTS = {
  editorBackground: 3,
  activityBarBackground: 2,
  statusBarBackground: 2,
  topStrip: 1,
  editorForeground: 0,
} as const;

/**
 * Workbench colors VS Code applies when a theme leaves a key unset
 * (src/vs/workbench/common/theme.ts, dark and light defaults).
 */
export const WORKBENCH_DEFAULTS: Record<
  'dark' | 'light',
  Partial<Record<keyof Palette, Hex>>
> = {
  dark: {
    editorForeground: '#bbbbbb',
    activityBarBackground: '#333333',
    statusBarBackground: '#007acc',
    titleBarActiveBackground: '#3c3c3c',
    tabsContainerBackground: '#252526',
  },
  light: {
    editorForeground: '#333333',
    activityBarBackground: '#2c2c2c',
    statusBarBackground: '#007acc',
    titleBarActiveBackground: '#dddddd',
    tabsContainerBackground: '#f3f3f3',
  },
};

export function themeKind(palette: Palette): 'dark' | 'light' {
  const background = palette.editorBackground;
  if (!background) return 'dark';
  return hexToLab(background)[0] < 50 ? 'dark' : 'light';
}

export function resolvedColor(
  palette: Palette,
  field: keyof Palette,
): Hex | null {
  return (
    palette[field] ?? WORKBENCH_DEFAULTS[themeKind(palette)][field] ?? null
  );
}

export interface PreparedTheme {
  theme: IndexedTheme;
  lab: Partial<Record<keyof Palette, Lab>>;
}

const RESOLVED_FIELDS: Array<keyof Palette> = [
  'editorBackground',
  'editorForeground',
  'activityBarBackground',
  'statusBarBackground',
  'titleBarActiveBackground',
  'tabsContainerBackground',
];

export function prepareThemes(themes: IndexedTheme[]): PreparedTheme[] {
  return themes.map((theme) => {
    const lab: PreparedTheme['lab'] = {};
    for (const field of RESOLVED_FIELDS) {
      const hex = resolvedColor(theme.palette, field);
      if (hex) lab[field] = hexToLab(hex);
    }
    return { theme, lab };
  });
}

export function scoreTheme(
  observation: Observation,
  prepared: PreparedTheme,
): { distance: number; fields: string[] } {
  let total = 0;
  let weight = 0;
  const fields: string[] = [];
  const observed = observation.colors;

  const add = (
    field: string,
    themeLab: Lab | undefined,
    sampleLab: Lab,
    w: number,
  ) => {
    if (!themeLab) return;
    total += w * deltaE(themeLab, sampleLab);
    weight += w;
    fields.push(field);
  };

  for (const field of [
    'editorBackground',
    'activityBarBackground',
    'statusBarBackground',
  ] as const) {
    const sample = observed[field];
    if (sample)
      add(field, prepared.lab[field], rgbToLab(sample), WEIGHTS[field]);
  }

  const title = prepared.lab.titleBarActiveBackground;
  const tabs = prepared.lab.tabsContainerBackground;
  const strips = observation.topStrips.map(rgbToLab);
  if (strips.length >= 2) {
    add(
      'titleBarActiveBackground',
      title,
      strips[strips.length - 2]!,
      WEIGHTS.topStrip,
    );
    add(
      'tabsContainerBackground',
      tabs,
      strips[strips.length - 1]!,
      WEIGHTS.topStrip,
    );
  } else if (strips.length === 1 && (title || tabs)) {
    const strip = strips[0]!;
    const candidates = [title, tabs]
      .filter((lab): lab is Lab => lab !== undefined)
      .map((lab) => deltaE(lab, strip));
    total += WEIGHTS.topStrip * Math.min(...candidates);
    weight += WEIGHTS.topStrip;
    fields.push('topStrip');
  }

  return {
    distance: weight > 0 ? total / weight : Number.POSITIVE_INFINITY,
    fields,
  };
}

/** Unknown rank (0) sorts after every known rank. */
function byRank(a: IndexedTheme, b: IndexedTheme): number {
  const ra = a.rank || Number.MAX_SAFE_INTEGER;
  const rb = b.rank || Number.MAX_SAFE_INTEGER;
  return ra - rb;
}

export function rankThemes(
  observation: Observation,
  prepared: PreparedTheme[],
  k = 5,
): Match[] {
  const scored = prepared.map((p) => ({
    theme: p.theme,
    ...scoreTheme(observation, p),
  }));
  scored.sort(
    (a, b) =>
      a.distance - b.distance ||
      byRank(a.theme, b.theme) ||
      a.theme.displayName.localeCompare(b.theme.displayName),
  );
  return scored.slice(0, k);
}
