import type { IndexedTheme } from './themeIndex.ts';

export interface ClassMatch<T extends { theme: IndexedTheme }> {
  /** Representative: the member with the best installs rank. */
  theme: IndexedTheme;
  /** Other members of the same palette class, best rank first. */
  identical: IndexedTheme[];
  score: T;
}

const byRank = (a: IndexedTheme, b: IndexedTheme) =>
  (a.rank || Number.MAX_SAFE_INTEGER) - (b.rank || Number.MAX_SAFE_INTEGER) ||
  a.displayName.localeCompare(b.displayName);

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
    const members = [...membersOf(cls)].sort(byRank);
    const representative = members[0] ?? hit.theme;
    out.push({
      theme: representative,
      identical: members.filter((m) => m.id !== representative.id),
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
