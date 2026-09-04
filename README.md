# 🕸️ What is my theme?

Drop a screenshot of an editor, get the VS Code theme. The page samples the
colors of the editor area, activity bar, status bar and top strips, converts
them to CIE Lab and ranks every theme scraped from
[vscodethemes.com](https://vscodethemes.com) by color distance, in your
browser, without uploading anything. When a match lands, the page repaints
itself with that theme.

This repository also holds the scrape that feeds it. Version 1 (2023) drove a
headless browser through the old site and screenshotted previews into S3 for a
classifier that never got trained. Version 2 reads the structured theme data
the current site inlines in every page and writes one JSON file.

## What is in the box

| Path | What |
|---|---|
| `packages/shared` | The `Theme` contract, the 24 palette fields, Lab color math, screenshot extraction and the k-NN matcher |
| `packages/scrape` | Crawler, storage adapter (local folder or S3), eval harness |
| `packages/web` | The identifier page (Vite, React 19, a Web Worker for the matching) |
| `model/` | PyTorch embedder trained on rendered previews, evaluation, ONNX export |
| `data/themes.json` | 32,742 themes across 15,873 extensions, crawled 2026-09-04 |
| `docs/adr/` | The decisions, one file each |

## How identification works

1. The screenshot is decoded to pixels in an `OffscreenCanvas` (downscaled to
   1600 px wide at most) and handed to a worker.
2. A convolutional network (865,888 weights, 128-dimensional output, run through
   ONNX Runtime Web) embeds the screenshot and picks the 200 themes whose
   rendered previews sit closest in that space.
3. The worker also reads the screenshot's regions: it takes the dominant color
   of every row in the middle 55% of the width and groups consecutive rows by
   Lab distance. The tallest group is the editor; the groups above it are the
   title bar and the tab strip; the group below it is the status bar. Columns
   inside the editor rows give the activity bar. A code-only crop yields one
   group and the page says so.
4. Those 200 candidates are ordered by the weighted CIE Lab distance between
   the colors read and the same fields of each theme (`editorBackground`,
   `activityBarBackground`, `statusBarBackground`, `titleBarActiveBackground`,
   `tabsContainerBackground`). Theme colors left unset take the VS Code
   workbench defaults for dark or light themes.
5. Results collapse into palette classes, because the themes share only 26,699
   distinct 24-color palettes. A class is named after its most installed member
   and lists the rest as identical palettes.
6. The top five come back with the upstream preview beside your crop, the ΔE
   and what it means: under 1 is the same color, under 2.3 the eye cannot tell
   them apart, above 10 is a different color.

Nothing is uploaded. Without the model files the page falls back to the color
distance alone and says so in the status bar.

### Measured

Queries are preview SVGs of two languages no gallery embedding is built from
(`css`, `java`), rendered at random zoom between 0.75x and 1.5x, cut as a whole
window, a corner, or the code area only, and saved as JPEG at quality 60 to 95.
Every path is scored on the same 4,000 files. The rows marked "page code" run
the exact preprocessing and ranking the page runs, not a Python approximation.
Numbers come from [`eval/report.json`](eval/report.json), and the page reads its
per-crop rates from the same file.

<!-- generated: eval table, from eval/report.json by scripts/fill-docs.py -->
| Path | Trained on | Themes searched | top-1 | top-5 | top-1 class | top-5 class | top-5 by crop: window / corner / code-only |
|---|---|---|---|---|---|---|---|
| Model then colors, page code | 32,742 themes, 14 epochs | 32,742 | 42.3 | 61.1 | 45.9 | 64.3 | 83.1 / 63.5 / 35.8 |
| Model only, page code | 32,742 themes, 14 epochs | 32,742 | 33.4 | 52.2 | 36.0 | 55.4 | 77.7 / 49.2 / 28.9 |
| Model only, PyTorch | 2,000 themes | 32,741 | 28.8 | 47.5 | 32.7 | 52.0 | 72.8 / 43.8 / 25.2 |
| Model only, PyTorch | 32,742 themes, 14 epochs | 32,741 | 35.7 | 54.1 | 38.4 | 57.0 | 81.6 / 51.3 / 28.5 |
| Model only, PyTorch | 2,000 themes | 2,000 | 53.1 | 75.0 | 54.6 | 75.9 | 93.0 / 73.9 / 57.7 |
| Colors only | not trained | 32,742 | 33.8 | 50.9 | 39.6 | 56.9 | 70.6 / 54.2 / 27.0 |
<!-- /generated -->

The class columns count a hit when the right palette is found, the plain
columns when the exact theme is. They differ because copies are everywhere: a
Dracula screenshot matches 19 themes with byte-identical colors, so which one
sorts first is decided by installs rank rather than by anything measurable in
the image.

<!-- generated: shipped summary -->
**Shipped: model then colors, page code.** Against all 32,742 themes, on 4,000 held-out previews, the right palette lands in the top five 64.3% of the time and first 45.9% of the time.

By crop, top-5: whole window 83.1%, corner 63.5%, code only 35.8%. Whole windows do not clear the 90% top-5 gate; code-only crops sit far below it, which is why the page asks for the window chrome and states the rate for the crop it was given.

On whole windows the paths that were not shipped reach: model only, page code 77.7%; model only, PyTorch 81.6%; colors only 70.6%.
<!-- /generated -->

## Run it

```sh
npm install
npm run scrape -- metadata              # crawl vscodethemes.com into data/themes.json
npm run scrape -- previews --limit 200  # preview SVGs into ./previews (or S3, see below)
npm run index                           # theme index for the page, and accuracy.json from eval/report.json
npm run dev                             # the page on http://localhost:5175
npm test                                # vitest across packages
npm run -w @vscodethemes/web e2e        # Playwright: a Dracula screenshot must rank Dracula first
```

S3 upload switches on when `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
`AWS_REGION` and `BUCKET_NAME` are all set (see `.env.example`). Keys keep the
old `<Theme name>/<slug>-<lang>.svg` layout.

### Eval and model

```sh
# queries and the colors-only baseline (writes eval/queries and eval/report.json)
npm run eval -- --themes 2000 --seed 42 --approach knn

# previews rendered for training, and one per theme for the gallery embeddings
npm run -w @vscodethemes/scrape eval:render -- --themes 2000 --seed 42 --classes 2000
npm run -w @vscodethemes/scrape eval:render -- --themes 2000 --seed 42 --gallery all --languages js

cd model
uv run python -m wimt.train --themes 2000 --seed 42 --classes 2000 --epochs 12
uv run python -m wimt.evaluate --themes 2000 --seed 42 --classes 2000 --gallery all
uv run python -m wimt.export --themes 2000 --seed 42 --classes 2000 --out ../packages/web/public/model
cd ..

# the paths that use the exported model through the page's own code
npm run eval -- --themes 2000 --seed 42 --approach cnn
npm run eval -- --themes 2000 --seed 42 --approach hybrid

npm run index                        # refresh the rates the page quotes
python3 scripts/fill-docs.py hybrid  # refresh the table above and ADR 0003
```

`renders/`, `previews/` and `eval/queries/` are working directories and stay out
of git. `packages/web/public/model/` is committed, because the deployed page
needs it.

## Deploy

The page is static: an HTML shell, a 65 KB gzipped bundle, the theme index at
1.7 MB gzipped, a 3.4 MB ONNX graph, a 4.1 MB int8 gallery and the ONNX Runtime
wasm at 3.7 MB gzipped. On Vercel, set the root directory to `packages/web`; the
included `vercel.json` installs and builds from the repository root, which
regenerates the index before building. Proposed subdomain:
`whatismytheme.lucasmsa.com`.

## ⌘ Scrape v2 in one paragraph

vscodethemes.com is a Remix app. `GET /?page=N&_data=routes%2F_index` returns
36 extensions per page as JSON, sorted by installs;
`GET /e/<publisher>.<extension>/<theme>?page=K&_data=routes%2Fe.%24slug.%24theme`
returns the full 24-color palette of one theme plus 16 sibling themes per page.
The crawler walks the index, pages through siblings, fetches each theme once
through a resumable NDJSON cache, and writes `data/themes.json` sorted by id.
Preview SVGs live on `images.vscodethemes.com` and come in seven languages
(`js`, `py`, `go`, `html`, `css`, `cpp`, `java`); the page links to them, the
eval and the model download them.

### License

[MIT](LICENSE)
