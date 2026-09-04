"""Embed every gallery render and average per theme into one prototype."""

from __future__ import annotations

import numpy as np
import torch
from torch.utils.data import DataLoader

from .data import RenderDataset, list_renders
from .net import ThemeEmbedder


@torch.no_grad()
def embed_dataset(embedder: ThemeEmbedder, dataset, dev: torch.device, batch: int = 256) -> np.ndarray:
    loader = DataLoader(dataset, batch_size=batch, shuffle=False, num_workers=4)
    chunks = []
    for images, _ in loader:
        chunks.append(embedder(images.to(dev)).cpu().numpy())
    return np.concatenate(chunks) if chunks else np.zeros((0, 128), dtype=np.float32)


def build_gallery(embedder: ThemeEmbedder, theme_ids: list[str], languages: list[str], dev: torch.device) -> tuple[list[str], np.ndarray]:
    samples = list_renders(theme_ids, languages)
    embeddings = embed_dataset(embedder, RenderDataset(samples, augment=False), dev)
    ids = sorted({s.theme_id for s in samples})
    index = {theme_id: i for i, theme_id in enumerate(ids)}
    prototypes = np.zeros((len(ids), embeddings.shape[1]), dtype=np.float32)
    counts = np.zeros(len(ids), dtype=np.int32)
    for sample, vector in zip(samples, embeddings):
        prototypes[index[sample.theme_id]] += vector
        counts[index[sample.theme_id]] += 1
    prototypes /= np.maximum(counts, 1)[:, None]
    prototypes /= np.linalg.norm(prototypes, axis=1, keepdims=True) + 1e-8
    return ids, prototypes
