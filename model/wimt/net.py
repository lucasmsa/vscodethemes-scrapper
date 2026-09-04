"""A small CNN embedding network with a cosine classifier head."""

from __future__ import annotations

import torch
from torch import nn
from torch.nn import functional as F

EMBED_DIM = 128


def block(cin: int, cout: int) -> nn.Sequential:
    return nn.Sequential(
        nn.Conv2d(cin, cout, 3, padding=1, bias=False),
        nn.BatchNorm2d(cout),
        nn.ReLU(inplace=True),
        nn.Conv2d(cout, cout, 3, padding=1, bias=False),
        nn.BatchNorm2d(cout),
        nn.ReLU(inplace=True),
        nn.MaxPool2d(2),
    )


class ThemeEmbedder(nn.Module):
    def __init__(self, embed_dim: int = EMBED_DIM):
        super().__init__()
        self.features = nn.Sequential(block(3, 32), block(32, 64), block(64, 128), block(128, 192))
        self.head = nn.Sequential(nn.AdaptiveAvgPool2d(1), nn.Flatten(), nn.Linear(192, embed_dim))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return F.normalize(self.head(self.features(x)), dim=1)


class CosineClassifier(nn.Module):
    """Normalized softmax: logits are scaled cosine similarities to class weights."""

    def __init__(self, embed_dim: int, classes: int, scale: float = 30.0):
        super().__init__()
        self.weight = nn.Parameter(torch.randn(classes, embed_dim) * 0.01)
        self.scale = scale

    def forward(self, embeddings: torch.Tensor) -> torch.Tensor:
        return self.scale * embeddings @ F.normalize(self.weight, dim=1).t()
