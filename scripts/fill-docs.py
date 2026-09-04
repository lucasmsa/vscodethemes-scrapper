"""Fill README.md and docs/adr/0003 from eval/report.json and data/themes.json.

Every number in those documents comes from here, so a claim in the docs is a claim
some run actually produced. usage: python3 scripts/fill-docs.py [hybrid|cnn|knn]
"""

from __future__ import annotations

import gzip
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# Runs before the palette-class metrics, and model runs from before the training scale
# was recorded, cannot be compared row by row with the rest.
RUNS = [
    r
    for r in json.loads((ROOT / "eval/report.json").read_text())["runs"]
    if "top1Class" in r and (r["approach"] == "knn" or r.get("classes"))
]


def read_themes() -> list[dict]:
    plain = ROOT / "data/themes.json"
    if plain.exists():
        return json.loads(plain.read_text())
    with gzip.open(ROOT / "data/themes.json.gz", "rt") as handle:
        return json.load(handle)


THEMES = read_themes()
FULL = len(THEMES)
FULL_ENOUGH = FULL * 0.99  # one theme has no preview render, so a full run searches 32,741
EXTENSIONS = len({f"{t['extension']['publisher']}.{t['extension']['slug']}" for t in THEMES})
shipped = sys.argv[1] if len(sys.argv) > 1 else "hybrid"

LABEL = {
    "knn": "Colors only",
    "cnn": "Model only, PyTorch",
    "cnn-onnx": "Model only, page code",
    "hybrid": "Model then colors, page code",
}
ORDER = ["hybrid", "cnn-onnx", "cnn", "knn"]


def num(value) -> str:
    return "-" if value is None else f"{value:.1f}"


def trained_on(run: dict) -> str:
    if run["approach"] == "knn":
        return "not trained"
    classes = run.get("classes")
    epochs = run.get("epochs")
    if not classes:
        return "unrecorded"
    return f"{classes:,} themes" + (f", {epochs} epochs" if epochs else "")


def latest_of(approach: str, full_gallery: bool = False) -> dict | None:
    for run in reversed(RUNS):
        if run["approach"] != approach:
            continue
        if full_gallery and run["gallery"] < FULL_ENOUGH:
            continue
        return run
    return None


latest: dict[tuple, dict] = {}
for run in RUNS:
    latest[(run["approach"], run.get("classes"), run["gallery"])] = run

rows = [
    "| Path | Trained on | Themes searched | top-1 | top-5 | top-1 class | top-5 class | top-5 by crop: window / corner / code-only |",
    "|---|---|---|---|---|---|---|---|",
]
for run in sorted(latest.values(), key=lambda r: (ORDER.index(r["approach"]) if r["approach"] in ORDER else 9, -r["gallery"])):
    crops = run["byCrop"]
    rows.append(
        f"| {LABEL.get(run['approach'], run['approach'])} | {trained_on(run)} | {run['gallery']:,} | "
        f"{num(run['top1'])} | {num(run['top5'])} | {num(run.get('top1Class'))} | {num(run.get('top5Class'))} | "
        f"{num(crops['window']['top5'])} / {num(crops['partial']['top5'])} / {num(crops['editor']['top5'])} |"
    )
table = "\n".join(rows)

winner = latest_of(shipped, True)
others = [r for a in ORDER if a != shipped and (r := latest_of(a, True))]

if winner:
    window = winner["byCrop"]["window"]
    editor = winner["byCrop"]["editor"]
    gate = "clear the 90% top-5 gate" if window["top5"] >= 90 else "do not clear the 90% top-5 gate"
    beaten = "; ".join(f"{LABEL[r['approach']][0].lower() + LABEL[r['approach']][1:]} {num(r['byCrop']['window']['top5'])}%" for r in others)
    shipped_line = (
        f"**Shipped: {LABEL[shipped].lower()}.** Against all {winner['gallery']:,} themes, on {winner['queries']:,} held-out "
        f"previews, the right palette lands in the top five {num(winner['top5Class'])}% of the time and first "
        f"{num(winner['top1Class'])}% of the time.\n\n"
        f"By crop, top-5: whole window {num(window['top5'])}%, corner {num(winner['byCrop']['partial']['top5'])}%, "
        f"code only {num(editor['top5'])}%. Whole windows {gate}; code-only crops sit far below it, which is why the page asks "
        f"for the window chrome and states the rate for the crop it was given.\n\nOn whole windows the paths that were not "
        f"shipped reach: {beaten}."
    )
else:
    shipped_line = "**Shipped: nothing yet, no full-gallery run in eval/report.json.**"

def fill(text: str, label: str, body: str, inline: bool = False) -> str:
    """Rewrite what sits between the markers, so running this twice changes nothing."""
    pattern = re.compile(
        rf"(<!-- generated: {re.escape(label)}[^>]*-->)(.*?)(<!-- /generated -->)", re.S
    )
    if not pattern.search(text):
        raise SystemExit(f"marker for {label!r} not found")
    joiner = "" if inline else "\n"
    return pattern.sub(lambda m: f"{m.group(1)}{joiner}{body}{joiner}{m.group(3)}", text)


def check_counts(text: str, path: str) -> None:
    """The prose states counts in words; they are asserted here rather than rewritten."""
    classes = len({"|".join(t["palette"].get(f) or "-" for f in PALETTE_FIELDS) for t in THEMES})
    for value, what in ((f"{FULL:,}", "themes"), (f"{EXTENSIONS:,}", "extensions"), (f"{classes:,}", "palette classes")):
        if value not in text:
            raise SystemExit(f"{path} does not state the {what} count {value}")


PALETTE_FIELDS = [
    "editorBackground", "editorForeground", "activityBarBackground", "activityBarForeground",
    "activityBarInActiveForeground", "activityBarBorder", "activityBarActiveBorder", "activityBarActiveBackground",
    "activityBarBadgeBackground", "activityBarBadgeForeground", "tabsContainerBackground", "tabsContainerBorder",
    "statusBarBackground", "statusBarForeground", "statusBarBorder", "tabActiveBackground", "tabInactiveBackground",
    "tabActiveForeground", "tabBorder", "tabActiveBorder", "tabActiveBorderTop", "titleBarActiveBackground",
    "titleBarActiveForeground", "titleBarBorder",
]

readme = (ROOT / "README.md").read_text()
readme = fill(readme, "eval table", table)
readme = fill(readme, "shipped summary", shipped_line)
check_counts(readme, "README.md")
(ROOT / "README.md").write_text(readme)

notes = []
for run in sorted(latest.values(), key=lambda r: (ORDER.index(r["approach"]) if r["approach"] in ORDER else 9, -r["gallery"])):
    crops = run["byCrop"]
    notes.append(
        f"- {LABEL.get(run['approach'], run['approach'])}, trained on {trained_on(run)}, searching {run['gallery']:,} themes: "
        f"top-1 {num(run['top1'])}%, top-5 {num(run['top5'])}% ({num(run.get('top5Class'))}% per palette class). "
        f"By crop, top-5: whole window {num(crops['window']['top5'])}%, corner {num(crops['partial']['top5'])}%, "
        f"code only {num(crops['editor']['top5'])}%. {run['msPerQuery']} ms per query."
    )

adr = (ROOT / "docs/adr/0003-eval-gated-identification.md").read_text()
adr = fill(adr, "eval table", table)
adr = fill(adr, "eval notes", "\n".join(notes))
adr = fill(
    adr,
    "shipped approach",
    inline=True,
    body={
        "hybrid": "the two together: the network retrieves 200 candidates, the sampled colors order them. Colors alone are the fallback when the model files fail to load",
        "cnn": "the network alone, exported to ONNX, with colors alone as the fallback",
        "knn": "colors alone",
    }[shipped],
)
adr = fill(
    adr,
    "shipped consequence",
    "The page carries a 3.4 MB ONNX graph and a 4.1 MB int8 gallery, cached by the browser after the first visit, "
    "and falls back to colors alone when either fails to load."
    if shipped != "knn"
    else "The page needs only the theme index; there is no model to download.",
)
(ROOT / "docs/adr/0003-eval-gated-identification.md").write_text(adr)

left = [p for p in ("README.md", "docs/adr/0003-eval-gated-identification.md") if "{{" in (ROOT / p).read_text()]
print("placeholders left:", left or "none")
print(table)
print()
print(shipped_line)
