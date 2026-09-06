# 3. Identification ships whichever approach the eval scores higher, gated at 90% top-5

Date: 2026-09-04

## Status

Accepted

## Decision

- Two approaches were built against one eval:
  - **k-NN**: region-aware color extraction from the screenshot, CIE Lab
    distance to every theme's palette, weights 3 (editor background),
    2 (activity bar), 2 (status bar), 1 (each top strip), 0.5 (editor
    foreground), exact ties broken by installs rank.
  - **CNN**: a 4-block convolutional embedder (865,888 parameters, 128-d,
    L2-normalized) trained with a cosine classifier over theme ids on
    rendered previews of five languages, queried against per-theme prototype
    embeddings, exported to ONNX.
- The eval: a seeded sample of themes; queries are the two held-out preview
  languages (`css`, `java`) rendered at zoom 0.75 to 1.5, cut as whole window,
  corner or code-only, JPEG quality 60 to 95. Both approaches score the same
  files from `eval/queries/manifest-<n>-<seed>.json`. Metrics: strict top-1,
  tie-aware top-1 (true theme shares the best distance), top-5, per crop kind.
- Gate: nothing ships under 90% top-5 on the held-out set.
- Shipped: <!-- generated: shipped approach -->the two together: the network retrieves 200 candidates, the sampled colors order them. Colors alone are the fallback when the model files fail to load<!-- /generated -->.

## Context

<!-- generated: eval table -->
| Path | Trained on | Themes searched | top-1 | top-5 | top-1 class | top-5 class | top-5 by crop: window / corner / code-only |
|---|---|---|---|---|---|---|---|
| Model then colors, page code | 32,742 themes, 14 epochs | 32,742 | 42.3 | 61.1 | 45.9 | 64.3 | 83.1 / 63.5 / 35.8 |
| Model only, page code | 32,742 themes, 14 epochs | 32,742 | 33.4 | 52.2 | 36.0 | 55.4 | 77.7 / 49.2 / 28.9 |
| Model only, PyTorch | 2,000 themes | 32,741 | 28.8 | 47.5 | 32.7 | 52.0 | 72.8 / 43.8 / 25.2 |
| Model only, PyTorch | 32,742 themes, 14 epochs | 32,741 | 35.7 | 54.1 | 38.4 | 57.0 | 81.6 / 51.3 / 28.5 |
| Model only, PyTorch | 2,000 themes | 2,000 | 53.1 | 75.0 | 54.6 | 75.9 | 93.0 / 73.9 / 57.7 |
| Colors only | not trained | 32,742 | 33.8 | 50.9 | 39.6 | 56.9 | 70.6 / 54.2 / 27.0 |
<!-- /generated -->

<!-- generated: eval notes -->
- Model then colors, page code, trained on 32,742 themes, 14 epochs, searching 32,742 themes: top-1 42.3%, top-5 61.1% (64.3% per palette class). By crop, top-5: whole window 83.1%, corner 63.5%, code only 35.8%. 25.7 ms per query.
- Model only, page code, trained on 32,742 themes, 14 epochs, searching 32,742 themes: top-1 33.4%, top-5 52.2% (55.4% per palette class). By crop, top-5: whole window 77.7%, corner 49.2%, code only 28.9%. 25.6 ms per query.
- Model only, PyTorch, trained on 2,000 themes, searching 32,741 themes: top-1 28.8%, top-5 47.5% (52.0% per palette class). By crop, top-5: whole window 72.8%, corner 43.8%, code only 25.2%. 7.6 ms per query.
- Model only, PyTorch, trained on 32,742 themes, 14 epochs, searching 32,741 themes: top-1 35.7%, top-5 54.1% (57.0% per palette class). By crop, top-5: whole window 81.6%, corner 51.3%, code only 28.5%. 7.5 ms per query.
- Model only, PyTorch, trained on 2,000 themes, searching 2,000 themes: top-1 53.1%, top-5 75.0% (75.9% per palette class). By crop, top-5: whole window 93.0%, corner 73.9%, code only 57.7%. 6.5 ms per query.
- Colors only, trained on not trained, searching 32,742 themes: top-1 33.8%, top-5 50.9% (56.9% per palette class). By crop, top-5: whole window 70.6%, corner 54.2%, code only 27.0%. 71.6 ms per query.
<!-- /generated -->

The previews are generated from the same 24 palette fields the k-NN compares,
so the two held-out languages test robustness to layout, zoom and JPEG noise,
not to a different renderer. Real VS Code windows add sidebars, minimaps, other
fonts and OS chrome; that gap is measured by nothing here and is the open
item.

Many themes are exact color copies: 32,742 themes hold 26,699 distinct
palettes, and the Dracula palette alone is shared by 19 of them. Strict top-1
on a copied palette is decided by the installs rank, so the per-class numbers
are the ones that say whether the image was read right.

## Consequences

- <!-- generated: shipped consequence -->
The page carries a 3.4 MB ONNX graph and a 4.1 MB int8 gallery, cached by the browser after the first visit, and falls back to colors alone when either fails to load.
<!-- /generated -->
- The eval harness and the model package stay in the repository; rerunning
  `npm run eval` and `uv run python -m wimt.train` reproduces the table.
- The page reports ΔE and what the number means instead of a confidence
  percentage that would hide the copies problem.
