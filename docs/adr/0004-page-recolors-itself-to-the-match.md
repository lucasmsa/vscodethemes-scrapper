# 4. The identifier page recolors itself with the matched theme

Date: 2026-09-04

## Status

Accepted

## Decision

- The page is laid out like an editor window: title bar, activity rail, tab
  strip, editor area, status bar. Each region is painted from a CSS custom
  property (`--chrome-bg`, `--rail-bg`, `--tabs-bg`, `--page-bg`, `--status-bg`
  and their foregrounds, plus `--accent`).
- When a match lands, `pageThemeFromPalette` maps the matched theme's palette
  onto those properties. Unset theme colors take the VS Code workbench
  defaults for the theme's kind (dark or light, decided by the editor
  background's Lab lightness).
- Every text color is checked against its background with the WCAG relative
  luminance formula. A theme foreground below 4.5:1 is replaced by the editor
  foreground, then by white or black, whichever contrasts more. A secondary
  foreground is derived by mixing toward the background only as far as still
  clears 4.5:1.
- Type is Azeret Mono from Google Fonts with Martian Mono and IBM Plex Mono as
  the named alternates in the single `--font-mono` token. Body 17px, headline
  `clamp(44px, 7.5vw, 104px)`.
- Colors transition over 600 ms, disabled under `prefers-reduced-motion`.
- Everything runs in the browser: the screenshot is decoded to pixels in an
  `OffscreenCanvas`, extraction and ranking run in a Web Worker, and no image
  is uploaded anywhere.

## Context

A list of five names with swatches tells you which theme it is. Painting the
page with the theme shows you, and the layout already has the same regions
the matcher samples, so the mapping is direct: the status bar color found in
the screenshot becomes the page's status bar.

## Consequences

- Themes with unset or low-contrast chrome colors still yield a readable page,
  at the cost of not being a pixel-faithful reproduction.
- The default palette before any upload is a neutral dark set with a mustard
  accent; it is only ever visible until the first match.
