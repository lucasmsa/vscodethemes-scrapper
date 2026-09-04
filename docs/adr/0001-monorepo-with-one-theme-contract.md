# 1. One repo, three packages, one Theme contract

Date: 2026-09-04

## Status

Accepted

## Decision

- The repository becomes an npm-workspaces monorepo:
  `packages/shared` (types, color math, extraction, matching),
  `packages/scrape` (crawler, storage, eval harness),
  `packages/web` (Vite + React 19 identifier page) and `model/` (uv + PyTorch
  training, evaluation and ONNX export).
- `Theme` in `packages/shared/src/theme.ts` and the 24 `PALETTE_FIELDS` in
  `palette.ts` are the single data contract. The scrape writes it, the eval
  reads it, the web loads a compact row-per-theme index built from it
  (`themeIndex.ts`). Nothing else defines a theme shape.
- `data/themes.json` is committed. Preview SVGs are not; they are linked from
  `images.vscodethemes.com` and cached locally or in S3 by the scrape.
- The sibling repository `vscodethemes-classifier` stays untouched. It holds a
  Colab notebook that downloads the old S3 bucket and never trained a model;
  archiving it with a pointer here is a follow-up outside this change.

## Context

The 2023 repository was a single Puppeteer crawler that screenshotted preview
SVGs into S3 for a classifier that was never built. Adding a web page that
identifies a theme from a screenshot needs the same palette data on both
sides, and keeping the crawler, the matcher and the page in one tree means a
field added to the scrape is a type error in the page until it is handled.

## Consequences

- One `npm install`, one `npm test`, one typecheck across packages.
- The web bundle imports `@vscodethemes/shared` source directly through the
  workspace; there is no build step for shared.
- Python lives beside TypeScript. `model/` reads the same `eval/queries`
  manifest the TypeScript eval writes, so both approaches are scored on
  identical images.
