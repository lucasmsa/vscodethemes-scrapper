"""Export the embedder to ONNX and check parity with PyTorch on a batch of queries.

usage: uv run python -m wimt.export --themes 2000 --seed 42 --gallery sample --out ../packages/web/public/model
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import onnxruntime as ort
import torch

from .data import INPUT_H, INPUT_W, QueryDataset, load_queries
from .net import ThemeEmbedder
from .paths import RUNS


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--themes", type=int, default=2000)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--classes", type=int, default=2000)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    run_dir = RUNS / f"c{args.classes}-{args.themes}-{args.seed}"
    checkpoint = torch.load(run_dir / "embedder.pt", map_location="cpu")
    embedder = ThemeEmbedder()
    embedder.load_state_dict(checkpoint["embedder"])
    embedder.eval()

    args.out.mkdir(parents=True, exist_ok=True)
    onnx_path = args.out / "embedder.onnx"
    dummy = torch.zeros(1, 3, INPUT_H, INPUT_W)
    torch.onnx.export(
        embedder,
        dummy,
        onnx_path,
        input_names=["image"],
        output_names=["embedding"],
        dynamic_axes={"image": {0: "batch"}, "embedding": {0: "batch"}},
        opset_version=17,
        dynamo=False,
    )

    _, queries = load_queries(Path(RUNS.parent.parent / "eval" / "queries" / f"manifest-{args.themes}-{args.seed}.json"))
    batch = torch.stack([QueryDataset(queries)[i][0] for i in range(min(16, len(queries)))])
    with torch.no_grad():
        reference = embedder(batch).numpy()
    session = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    produced = session.run(None, {"image": batch.numpy()})[0]
    max_abs = float(np.max(np.abs(reference - produced)))
    print(f"onnx parity max abs diff {max_abs:.2e} on {batch.shape[0]} queries")
    assert max_abs < 1e-3, "ONNX output drifts from PyTorch"

    prototypes = np.load(run_dir / "gallery.npy").astype(np.float32)
    ids = json.loads((run_dir / "gallery-ids.json").read_text())
    # Rows follow data/themes.json (the web index order); themes without renders get a zero row.
    from .paths import read_themes

    all_ids = [t["id"] for t in read_themes()]
    row_of = {theme_id: i for i, theme_id in enumerate(ids)}
    ordered = np.zeros((len(all_ids), prototypes.shape[1]), dtype=np.float32)
    present = 0
    for i, theme_id in enumerate(all_ids):
        row = row_of.get(theme_id)
        if row is not None:
            ordered[i] = prototypes[row]
            present += 1
    quantized = np.clip(np.round(ordered * 127.0), -127, 127).astype(np.int8)
    quantized.tofile(args.out / "gallery.i8")
    (args.out / "gallery.json").write_text(
        json.dumps(
            {
                "count": len(all_ids),
                "present": present,
                "dim": int(ordered.shape[1]),
                "scale": 127,
                "input": [INPUT_W, INPUT_H],
                "order": "data/themes.json",
                "trainedClasses": len(checkpoint["theme_ids"]),
                "epochs": checkpoint.get("epochs"),
            }
        )
    )
    # Worst-case cosine drift from int8 rounding, measured over the rows that carry an embedding.
    filled = ordered[np.any(ordered != 0, axis=1)]
    dequantized = quantized[np.any(ordered != 0, axis=1)].astype(np.float32) / 127.0
    drift = float(np.max(np.abs(np.sum(filled * dequantized, axis=1) - np.sum(filled * filled, axis=1)))) if len(filled) else 0.0
    print(
        f"wrote {onnx_path} ({onnx_path.stat().st_size // 1024} KB), gallery.i8 for {present}/{len(all_ids)} themes "
        f"({quantized.nbytes // 1024} KB), int8 cosine drift <= {drift:.5f}"
    )


if __name__ == "__main__":
    main()
