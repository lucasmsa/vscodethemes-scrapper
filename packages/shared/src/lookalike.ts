import { classMembers, installsRank } from './collapse.ts';
import { paletteDistance } from './match.ts';
import type { IndexedTheme } from './themeIndex.ts';

/**
 * The just-noticeable difference the page already quotes: two colors this far apart in
 * CIE Lab are a difference the eye cannot see. Two themes within this on the weighted
 * mean over the five regions the page reads are the same look wearing two names.
 */
export const LOOKALIKE_BAND = 2.3;

export interface Scored {
  theme: IndexedTheme;
  distance: number;
}

export interface Lookalike<T extends Scored> {
  /** Representative of the winning palette class: its most installed member. */
  theme: IndexedTheme;
  score: T;
  /** How far the readout's palette sits from the winner's. */
  apart: number;
  /** Themes inside the band, the winner included. */
  considered: number;
}

/**
 * The most installed theme whose palette sits within `band` of the ranking's winner.
 * Null when that theme is the one already shown first, which is every case where the
 * colors and the installs agree, and every case where the difference is only a copy of
 * the same palette, since a palette class is already named after its most installed
 * member.
 */
export function popularLookalike<T extends Scored>(
  ranked: T[],
  membersOf: (paletteClass: number) => IndexedTheme[],
  band = LOOKALIKE_BAND,
): Lookalike<T> | null {
  const best = ranked[0];
  if (!best || !Number.isFinite(best.distance)) return null;
  const shown = classMembers(best.theme, membersOf)[0]!;
  let winner = shown;
  let score = best;
  let apart = 0;
  let considered = 0;
  for (const hit of ranked) {
    const gap = paletteDistance(hit.theme.palette, best.theme.palette);
    if (!(gap <= band)) continue;
    considered++;
    const representative = classMembers(hit.theme, membersOf)[0]!;
    if (installsRank(representative) >= installsRank(winner)) continue;
    winner = representative;
    score = hit;
    apart = gap;
  }
  if (winner.id === shown.id) return null;
  return { theme: winner, score, apart, considered };
}
