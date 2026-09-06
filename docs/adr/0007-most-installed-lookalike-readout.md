# 7. The most installed lookalike is a second readout, not a change to the ranking

Date: 2026-09-06

## Status

Accepted

## Decision

- The ranking is untouched. Beside it the page names the most installed theme
  whose palette sits within ΔE 2.3 of the ranking's winner, across the five
  regions the ranking reads, or names nothing when that theme is the winner.
- `paletteDistance` (`packages/shared/src/match.ts`) measures theme against
  theme on the scale `scoreTheme` measures theme against screenshot: a weighted
  mean CIE Lab ΔE over `editorBackground` (3), `activityBarBackground` (2),
  `statusBarBackground` (2), `titleBarActiveBackground` (1) and
  `tabsContainerBackground` (1), with the workbench defaults filling unset
  colors. The weights are read off the ranking's own table, so the two cannot
  drift apart.
- `popularLookalike` (`packages/shared/src/lookalike.ts`) picks the readout out
  of the same 200 candidates the ranking ordered, and returns null when the
  winner of the band is the theme already shown first. `LOOKALIKE_BAND` is the
  one free parameter.
- The page renders it under the accuracy block as "if you want the popular
  one", carrying its own ΔE to the screenshot, how far its palette sits from
  the first result's, and how many themes it was chosen from.
- `npm run eval` reports the readout at bands 0, 1, 1.5, 2.3 and 5 in every
  run's `lookalike` array. The sweep is excluded from `msPerQuery`.

## Context

Two things the page computes and then throws away. The model hands back 200
candidates, five palette classes are shown, and the other 195 go in the bin,
their installs ranks with them. Installs rank reaches the page only as the
choice of a class name (ADR 5) and, on the colors-only path, as a tiebreak
inside `rankThemes` (ADR 6, "Installs rank stays a tiebreak and does not enter
the score"). On the median query where the readout fires, the extension behind
the first result sits at installs rank 7,008 and the readout at 63.

The palette equivalence class cannot carry this. A class is 24 byte-identical
colors and `collapseToClasses` already names it after its most installed
member, so the most installed theme in the first result's class is the first
result. A class-based readout would be silent on 100% of queries by
construction.

A band on the distance to the screenshot cannot carry it either. Two themes
whose distances to the sampled colors differ by under 2.3 fit the screenshot
about equally well, which is a claim about the evidence, not about the two
themes: they can sit on opposite sides of the sampled color and be 4.6 apart
from each other. Measured on the same 4,000 queries with the band applied to
the distance rather than to the palette, it also admits far too much, firing on
79.65% of queries out of a mean 86.1 of the 200 candidates, against 58.83% out
of 39.0 for the palette band. That run is not in `eval/report.json`; the
harness now measures the shipped definition.

ΔE 2.3 is the just-noticeable difference the page already prints under every
result. The palette band applies it to the object it describes, a pair of
colors, so "the eye cannot see the difference" is the literal reading. The
sweep, hybrid path, 4,000 held-out queries, seed 42, all 32,742 themes:

| Band | Fires | Not among the five shown | Themes in the band | Palette gap | ΔE the readout gives up | Readout rank | First result rank |
| ---- | ----- | ------------------------ | ------------------ | ----------- | ----------------------- | ------------ | ----------------- |
| 0    | 13.57 | 53.59                    | 8.6                | 0.00        | 0.00                    | 157          | 6,627             |
| 1    | 32.83 | 69.69                    | 16.7               | 0.58        | 0.33                    | 157          | 7,447             |
| 1.5  | 45.00 | 73.83                    | 23.3               | 1.04        | 0.56                    | 108          | 7,442             |
| 2.3  | 58.83 | 80.15                    | 39.0               | 1.61        | 0.90                    | 63           | 7,008             |
| 5    | 78.53 | 88.89                    | 92.3               | 3.00        | 1.85                    | 20           | 7,001             |

Fires is a percentage of all 4,000 queries; the rest are over the queries where
the readout renders, "not among the five shown" as a percentage, palette gap
and the two ranks as medians, the two remaining columns as means. Palette gap
is how far the readout's palette sits from the winner's, and the column after
it is how much further the readout sits from the screenshot than the first
result does. Widening past 2.3 buys popularity with a claim that stops being
true: at band 5 the readout's palette sits a median 3.00 ΔE from the winner's,
which the page's own scale calls a visible difference.

At 2.3 the readout differs from the first result on 58.83% of the 4,000
queries, and on 80.15% of those it names a theme none of the five rows carry,
so it surfaces something otherwise discarded on 47.2% of all queries. It costs
a mean 0.90 ΔE of fit against the first result, and 0.04% of readouts land
above the ΔE 10 the page calls a different color, which is why there is no
quality gate on top of the band.

The query themes are a uniform sample of the crawl, which ADR 6 found made the
eval unable to reward a popularity prior. Here it cuts the other way: a
uniformly sampled theme is unlikely to be the most installed one in its band,
so 58.83% is an upper bound on how often the readout fires for real traffic,
where the screenshot is more often of a popular theme already.

## Consequences

- No accuracy number moves. The run recording the readout reads 42.27 top-1,
  61.08 top-5, 45.88 top-1 class and 64.28 top-5 class, byte-identical per crop
  to the run before it, so `packages/web/src/generated/accuracy.json` and every
  figure in the README and ADR 3 stand.
- The readout names the query theme's palette class when the first result did
  not on 1.95% of queries, 78 of 4,000. That is not counted anywhere, because
  the ranking did not change and the readout is not a ranking.
- The true theme sits within ΔE 2.3 of a more installed one on 36.52% of
  queries, 55.47% of the times it is inside the band at all. Popularity and
  color disagree often enough that hiding one behind the other loses
  information either way round.
- Both palette class and installs rank come from the crawl, so a rescrape can
  move the readout to a different theme without any code changing.
- The readout searches the 200 candidates the ranking searched, not the whole
  catalogue. A more installed lookalike the model never retrieved is invisible
  to it, and finding one would cost the full color scan the hybrid path exists
  to avoid: 71.6 ms per query against 25.4.
