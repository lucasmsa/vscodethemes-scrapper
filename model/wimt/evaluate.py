"""Score the trained embedder on the same held-out queries the k-NN baseline used.

usage: uv run python -m wimt.evaluate --themes 2000 --seed 42 --gallery sample
"""

from __future__ import annotations

import argparse
import json
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import torch

from .data import QueryDataset, load_queries
from .gallery import build_gallery, embed_dataset
from .net import ThemeEmbedder
from .paths import REPORT, RUNS
from .train import device


PALETTE_FIELDS = [
    "editorBackground", "editorForeground", "activityBarBackground", "activityBarForeground",
    "activityBarInActiveForeground", "activityBarBorder", "activityBarActiveBorder", "activityBarActiveBackground",
    "activityBarBadgeBackground", "activityBarBadgeForeground", "tabsContainerBackground", "tabsContainerBorder",
    "statusBarBackground", "statusBarForeground", "statusBarBorder", "tabActiveBackground", "tabInactiveBackground",
    "tabActiveForeground", "tabBorder", "tabActiveBorder", "tabActiveBorderTop", "titleBarActiveBackground",
    "titleBarActiveForeground", "titleBarBorder",
]


def palette_classes(themes: list[dict]) -> dict[str, int]:
    """Same grouping as packages/shared/src/classes.ts: identical 24-color vectors share a class."""
    classes: dict[str, int] = {}
    class_of: dict[str, int] = {}
    for theme in themes:
        key = "|".join(theme["palette"].get(f) or "-" for f in PALETTE_FIELDS)
        class_of[theme["id"]] = classes.setdefault(key, len(classes))
    return class_of


def class_rank(row: np.ndarray, ids: list[str], class_of: dict[str, int], target_class: int, limit: int = 5) -> int:
    """Rank of the target palette class once same-class rows collapse, or -1 past `limit` classes."""
    seen: list[int] = []
    for gallery_row in row:
        cls = class_of.get(ids[gallery_row], -1)
        if cls in seen:
            continue
        seen.append(cls)
        if cls == target_class:
            return len(seen) - 1
        if len(seen) >= limit:
            break
    return -1


def tally(ranks: list[int], tied: list[bool], class_ranks: list[int] | None = None) -> dict:
    n = len(ranks)
    out = {
        "n": n,
        "top1": round(100 * sum(r == 0 for r in ranks) / n, 2) if n else 0,
        "top1Tied": round(100 * sum(tied) / n, 2) if n else 0,
        "top5": round(100 * sum(0 <= r < 5 for r in ranks) / n, 2) if n else 0,
    }
    if class_ranks is not None:
        out["top1Class"] = round(100 * sum(r == 0 for r in class_ranks) / n, 2) if n else 0
        out["top5Class"] = round(100 * sum(0 <= r < 5 for r in class_ranks) / n, 2) if n else 0
    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--themes", type=int, default=2000)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--classes", type=int, default=2000)
    parser.add_argument("--gallery", choices=["sample", "all"], default="all", help="prototype set: the eval sample or every theme with renders")
    args = parser.parse_args()

    dev = device()
    run_dir = RUNS / f"c{args.classes}-{args.themes}-{args.seed}"
    checkpoint = torch.load(run_dir / "embedder.pt", map_location=dev)
    embedder = ThemeEmbedder().to(dev)
    embedder.load_state_dict(checkpoint["embedder"])
    embedder.eval()

    manifest, queries = load_queries(Path(REPORT.parent / "queries" / f"manifest-{args.themes}-{args.seed}.json"))
    if args.gallery == "all":
        from .paths import read_themes

        gallery_ids = [t["id"] for t in read_themes()]
    else:
        gallery_ids = sorted({q.theme_id for q in queries})
    ids, prototypes = build_gallery(embedder, gallery_ids, checkpoint["train_languages"], dev)
    index = {theme_id: i for i, theme_id in enumerate(ids)}
    from .paths import read_themes

    class_of = palette_classes(read_themes())

    started = time.time()
    query_vectors = embed_dataset(embedder, QueryDataset(queries), dev)
    similarities = query_vectors @ prototypes.T
    order = np.argsort(-similarities, axis=1)
    ranks: list[int] = []
    tied: list[bool] = []
    class_ranks: list[int] = []
    by_crop: dict[str, tuple[list[int], list[bool], list[int]]] = {}
    for query, row, sims in zip(queries, order, similarities):
        target = index.get(query.theme_id, -1)
        rank = int(np.where(row == target)[0][0]) if target >= 0 else -1
        is_tied = rank >= 0 and abs(float(sims[target]) - float(sims[row[0]])) < 1e-6
        crank = class_rank(row[:200], ids, class_of, class_of.get(query.theme_id, -2))
        ranks.append(rank)
        tied.append(is_tied)
        class_ranks.append(crank)
        crop_ranks, crop_tied, crop_classes = by_crop.setdefault(query.crop, ([], [], []))
        crop_ranks.append(rank)
        crop_tied.append(is_tied)
        crop_classes.append(crank)
    ms_per_query = round(1000 * (time.time() - started) / max(len(queries), 1), 1)

    result = {
        "approach": "cnn",
        "classes": len(checkpoint["theme_ids"]),
        "epochs": checkpoint.get("epochs"),
        "gallery": len(ids),
        "sampleSize": args.themes,
        "seed": args.seed,
        "heldOut": manifest["heldOut"],
        "queries": len(queries),
        **tally(ranks, tied, class_ranks),
        "msPerQuery": ms_per_query,
        "byCrop": {crop: tally(r, t, c) for crop, (r, t, c) in by_crop.items()},
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }
    result.pop("n")
    print(json.dumps(result, indent=1))
    report = json.loads(REPORT.read_text()) if REPORT.exists() else {"runs": []}
    report["runs"].append(result)
    REPORT.write_text(json.dumps(report, indent=1) + "\n")

    np.save(run_dir / "gallery.npy", prototypes)
    (run_dir / "gallery-ids.json").write_text(json.dumps(ids))
    print(f"appended to {REPORT}; gallery saved in {run_dir}")


if __name__ == "__main__":
    main()
