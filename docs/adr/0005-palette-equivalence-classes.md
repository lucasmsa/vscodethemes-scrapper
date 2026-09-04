# 5. Identical palettes are one result, named after the most installed theme

Date: 2026-09-04

## Status

Accepted

## Decision

- Two themes whose 24 workbench colors are all equal belong to one palette
  class (`packages/shared/src/classes.ts`). The class is computed once when the
  theme index is built and stored per theme.
- Ranked results collapse into classes before display: the class is named after
  its member with the best installs rank, and the other members are listed
  behind a disclosure reading "and N identical palettes".
- Both evaluations report top-1 and top-5 per class alongside the strict
  per-theme numbers. The per-class number answers "did it read the colors
  right", the per-theme number answers "did it pick the copy the user has".

## Context

The 2026-09-04 crawl holds 32,742 themes with only 26,699 distinct palettes.
The largest classes are whole families: a Dracula screenshot has 19 themes
with byte-identical colors, so five per-theme results were five names for one
look, and strict top-1 was a lottery among copies that no amount of accuracy
could win.

## Consequences

- The five results are five different looks, which is what someone comparing
  them wants.
- A user whose theme is the fourth member of a class still finds it, one click
  down, instead of not being in the list at all.
- Class membership depends on the crawl: a theme that changes one color leaves
  its class on the next scrape.
