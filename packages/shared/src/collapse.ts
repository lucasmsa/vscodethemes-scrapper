import type { IndexedTheme } from './themeIndex.ts';

export interface ClassMatch<T extends { theme: IndexedTheme }> {
  /** Representative: the member with the best installs rank. */
  theme: IndexedTheme;
  /** Other members of the same palette class, best rank first. */
  identical: IndexedTheme[];
  score: T;
}

/** Unknown rank (0) sorts after every known rank; the name settles what is left. */
export const byInstalls = (a: IndexedTheme, b: IndexedTheme) =>
  installsRank(a) - installsRank(b) ||
  a.displayName.localeCompare(b.displayName);

export const installsRank = (theme: IndexedTheme) =>
  theme.rank || Number.MAX_SAFE_INTEGER;

/** The theme's palette class, most installed first, falling back to the theme itself. */
export function classMembers(
  theme: IndexedTheme,
  membersOf: (paletteClass: number) => IndexedTheme[],
): IndexedTheme[] {
  const members = [...membersOf(theme.paletteClass)].sort(byInstalls);
  return members.length > 0 ? members : [theme];
}

/**
 * Ranked per-theme results collapse into palette classes in ranking order; every class lists all
 * its members so the page can say "and N identical palettes" instead of five copies of one look.
 */
export function collapseToClasses<T extends { theme: IndexedTheme }>(
  ranked: T[],
  membersOf: (paletteClass: number) => IndexedTheme[],
  k: number,
): ClassMatch<T>[] {
  const seen = new Set<number>();
  const out: ClassMatch<T>[] = [];
  for (const hit of ranked) {
    const cls = hit.theme.paletteClass;
    if (seen.has(cls)) continue;
    seen.add(cls);
    const [representative, ...identical] = classMembers(hit.theme, membersOf);
    out.push({
      theme: representative!,
      identical,
      score: hit,
    });
    if (out.length >= k) break;
  }
  return out;
}

export function classMembersIndex(
  themes: IndexedTheme[],
): (paletteClass: number) => IndexedTheme[] {
  const members = new Map<number, IndexedTheme[]>();
  for (const theme of themes) {
    const list = members.get(theme.paletteClass) ?? [];
    list.push(theme);
    members.set(theme.paletteClass, list);
  }
  return (paletteClass) => members.get(paletteClass) ?? [];
}
