"""Train the embedder on rendered previews of a theme sample.

usage: uv run python -m wimt.train --themes 2000 --seed 42 --epochs 12
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import torch
from torch import nn
from torch.utils.data import DataLoader

from .data import TRAIN_LANGUAGES, RenderDataset, list_renders, load_queries
from .net import EMBED_DIM, CosineClassifier, ThemeEmbedder
from .paths import RUNS


def device() -> torch.device:
    if torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cuda" if torch.cuda.is_available() else "cpu")


def theme_ids_for_run(themes: int, seed: int, classes: int) -> list[str]:
    """The eval sample plus the first other themes in data/themes.json order until `classes` ids (same rule as eval/render.ts)."""
    from .paths import read_themes

    manifest, _ = load_queries(Path(RUNS.parent.parent / "eval" / "queries" / f"manifest-{themes}-{seed}.json"))
    chosen = {spec["id"] for spec in manifest["specs"]}
    for theme in read_themes():
        if len(chosen) >= classes:
            break
        chosen.add(theme["id"])
    return sorted(chosen)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--themes", type=int, default=2000)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--epochs", type=int, default=12)
    parser.add_argument("--batch", type=int, default=128)
    parser.add_argument("--lr", type=float, default=2e-3)
    parser.add_argument("--classes", type=int, default=2000, help="themes to train on: the eval sample plus a seeded fill")
    parser.add_argument("--workers", type=int, default=6)
    args = parser.parse_args()

    torch.manual_seed(args.seed)
    dev = device()
    theme_ids = theme_ids_for_run(args.themes, args.seed, args.classes)
    manifest, _ = load_queries(Path(RUNS.parent.parent / "eval" / "queries" / f"manifest-{args.themes}-{args.seed}.json"))
    train_languages = [lang for lang in TRAIN_LANGUAGES if lang not in manifest["heldOut"]]
    samples = list_renders(theme_ids, train_languages)
    print(f"device {dev}; {len(theme_ids)} classes; {len(samples)} training renders; languages {train_languages}")

    loader = DataLoader(
        RenderDataset(samples, augment=True, seed=args.seed),
        batch_size=args.batch,
        shuffle=True,
        num_workers=args.workers,
        drop_last=True,
        persistent_workers=args.workers > 0,
    )
    embedder = ThemeEmbedder().to(dev)
    classifier = CosineClassifier(EMBED_DIM, len(theme_ids)).to(dev)
    params = list(embedder.parameters()) + list(classifier.parameters())
    optimizer = torch.optim.AdamW(params, lr=args.lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.OneCycleLR(optimizer, max_lr=args.lr, total_steps=args.epochs * len(loader))
    loss_fn = nn.CrossEntropyLoss(label_smoothing=0.05)

    run_dir = RUNS / f"c{args.classes}-{args.themes}-{args.seed}"
    run_dir.mkdir(parents=True, exist_ok=True)
    history = []
    started = time.time()
    for epoch in range(args.epochs):
        embedder.train()
        classifier.train()
        total, correct, loss_sum = 0, 0, 0.0
        for images, labels in loader:
            images, labels = images.to(dev), labels.to(dev)
            logits = classifier(embedder(images))
            loss = loss_fn(logits, labels)
            optimizer.zero_grad(set_to_none=True)
            loss.backward()
            optimizer.step()
            scheduler.step()
            loss_sum += loss.item() * labels.size(0)
            correct += (logits.argmax(1) == labels).sum().item()
            total += labels.size(0)
        record = {"epoch": epoch + 1, "loss": round(loss_sum / total, 4), "train_acc": round(correct / total, 4), "minutes": round((time.time() - started) / 60, 1)}
        history.append(record)
        print(record, flush=True)
        torch.save(
            {"embedder": embedder.state_dict(), "theme_ids": theme_ids, "train_languages": train_languages, "epochs": epoch + 1},
            run_dir / "embedder.pt",
        )
    (run_dir / "history.json").write_text(json.dumps(history, indent=1))
    print(f"saved {run_dir / 'embedder.pt'}")


if __name__ == "__main__":
    main()
