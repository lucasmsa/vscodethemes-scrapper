# 6. Installs rank stays a tiebreak and does not enter the score

Date: 2026-09-06

## Status

Accepted

## Decision

- Ranking stays on color distance. Installs rank keeps the two jobs it already
  had: breaking exact ties in `rankThemes`, and naming a palette class after its
  most installed member.
- `packages/shared/src/match.ts` keeps the prior it was tested with.
  `rankPenalty` charges a theme `strength` weighted CIE Lab delta E for sitting
  at the worst installs rank, scaled by `log10(rank)` because installs are heavy
  tailed: nothing at rank 1, half at rank 126, all of it at rank 15,876. Both
  `orderByScore` and `rankThemes` default to strength 0, and no caller passes
  anything else.
- `npm run eval -- --approach hybrid --rankPrior <strength>` reruns the sweep,
  and every run records its `rankPrior` in `eval/report.json`.

## Context

The hypothesis was that a popular theme is a more likely answer than an obscure
one with a near-identical palette, so installs should move the score rather than
only settle ties. The same 4,000 held-out queries, seed 42, model then colors,
searching all 32,742 themes:

| Prior strength | top-1 | top-5 | top-1 class | top-5 class |
| -------------- | ----- | ----- | ----------- | ----------- |
| 0 (shipped)    | 42.27 | 61.08 | 45.88       | 64.28       |
| 0.05           | 36.98 | 53.88 | 42.50       | 60.20       |
| 0.25           | 37.05 | 53.80 | 42.90       | 60.27       |
| 0.5            | 36.48 | 53.23 | 42.58       | 60.00       |
| 1              | 35.45 | 52.85 | 41.85       | 59.33       |
| 2              | 32.23 | 49.98 | 38.27       | 56.98       |
| 5              | 24.32 | 40.55 | 29.60       | 47.85       |

Every strength loses on every metric, and past 0.25 the loss grows with the
strength. The weakest setting tried, 0.05 delta E spread across the whole rank
range, already costs 5.29 top-1 points and 7.20 top-5 points. Three things
explain that:

- Candidate distances are a weighted mean over five color fields, so competing
  themes are separated by fractions of a delta E and a penalty of 0.05 is enough
  to reorder them. At strength 0.05, `top1Tied` falls from 50.60 to 45.40: 208
  of the 4,000 queries lose a true theme that was sitting at the best distance.
- Exact color ties already have a better tiebreak. The model then colors path
  orders equal distances by embedding similarity, and installs rank is a
  downgrade from that.
- The eval cannot reward popularity by construction. Query themes are a uniform
  sample of the crawl: median installs rank 7,070 against a population median of
  7,199, and 3.7% of the 4,000 queries use a theme from the 100 most installed
  extensions. Real traffic is the opposite shape.

## Consequences

- The page ranks exactly as it did. The strength-0 control in
  `eval/report.json` reads 42.27 top-1 and 61.08 top-5, matching the run
  recorded before the experiment, so no number quoted by the README, ADR 3 or
  `packages/web/src/generated/accuracy.json` moves.
- `rankPenalty`, `orderByScore` and `--rankPrior` stay in the tree so the table
  above reruns, in the same way the eval keeps the approaches ADR 3 did not
  ship.
- The result bounds the cost of the prior against uniformly sampled queries; it
  does not measure what a prior would do against queries weighted by installs.
  Building an installs-weighted query set is the open item, and until it exists
  the hypothesis is untested rather than disproved.
