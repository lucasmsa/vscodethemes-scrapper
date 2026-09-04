"""Training and query datasets built from rendered previews.

Renders live in renders/<safe id>/<lang>.jpg at half preview size (230x166).
Training crops mimic the eval queries: whole window, a corner crop, or a
code-only crop, then a resize to INPUT_W x INPUT_H. Colors are never jittered,
because color is the signal.
"""

from __future__ import annotations

import io
import json
import random
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import torch
from PIL import Image, ImageFilter
from torch.utils.data import Dataset

from .paths import QUERIES, RENDERS

INPUT_W = 128
INPUT_H = 96
TRAIN_LANGUAGES = ["js", "py", "go", "html", "css", "cpp", "java"]

PREVIEW = {"width": 460, "height": 331, "title": 20, "tabs": 48, "activity_bar": 37, "status": 311}


def safe_id(theme_id: str) -> str:
    return theme_id.replace("/", "__")


@dataclass(frozen=True)
class Sample:
    theme_id: str
    label: int
    path: Path


def list_renders(theme_ids: list[str], languages: list[str]) -> list[Sample]:
    labels = {theme_id: i for i, theme_id in enumerate(theme_ids)}
    samples: list[Sample] = []
    for theme_id in theme_ids:
        folder = RENDERS / safe_id(theme_id)
        for lang in languages:
            path = folder / f"{lang}.jpg"
            if path.exists():
                samples.append(Sample(theme_id, labels[theme_id], path))
    return samples


def random_crop_box(kind: str, width: int, height: int, rng: random.Random) -> tuple[int, int, int, int]:
    scale = width / PREVIEW["width"]
    if kind == "window":
        return (0, 0, width, height)
    if kind == "editor":
        left = (PREVIEW["activity_bar"] + 8 + rng.random() * 60) * scale
        top = (PREVIEW["tabs"] + 8 + rng.random() * 60) * scale
        right = (PREVIEW["width"] - 8 - rng.random() * 40) * scale
        bottom = (PREVIEW["status"] - 8 - rng.random() * 40) * scale
        return (int(left), int(top), int(right), int(bottom))
    w = int(width * (0.6 + rng.random() * 0.35))
    h = int(height * (0.6 + rng.random() * 0.35))
    left = 0 if rng.random() < 0.5 else width - w
    top = height - h if rng.random() < 0.5 else 0
    return (left, top, left + w, top + h)


def jpeg_roundtrip(image: Image.Image, quality: int) -> Image.Image:
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=quality)
    buffer.seek(0)
    return Image.open(buffer).convert("RGB")


def to_tensor(image: Image.Image) -> torch.Tensor:
    resized = image.resize((INPUT_W, INPUT_H), Image.BILINEAR)
    array = np.asarray(resized, dtype=np.float32) / 255.0
    return torch.from_numpy(array).permute(2, 0, 1)


class RenderDataset(Dataset):
    def __init__(self, samples: list[Sample], augment: bool, seed: int = 0):
        self.samples = samples
        self.augment = augment
        self.rng = random.Random(seed)

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, int]:
        sample = self.samples[index]
        image = Image.open(sample.path).convert("RGB")
        if self.augment:
            kind = self.rng.choice(["window", "partial", "editor"])
            image = image.crop(random_crop_box(kind, image.width, image.height, self.rng))
            if self.rng.random() < 0.3:
                image = image.filter(ImageFilter.GaussianBlur(radius=self.rng.random() * 0.8))
            image = jpeg_roundtrip(image, self.rng.randint(55, 95))
        return to_tensor(image), sample.label


@dataclass(frozen=True)
class Query:
    theme_id: str
    crop: str
    path: Path


def load_queries(manifest: Path | None = None) -> tuple[dict, list[Query]]:
    manifest_path = manifest or Path(json.loads((QUERIES / "latest.json").read_text())["manifest"])
    data = json.loads(manifest_path.read_text())
    queries = [Query(spec["id"], spec["crop"], QUERIES / spec["file"]) for spec in data["specs"]]
    return data, queries


class QueryDataset(Dataset):
    def __init__(self, queries: list[Query]):
        self.queries = queries

    def __len__(self) -> int:
        return len(self.queries)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, int]:
        return to_tensor(Image.open(self.queries[index].path).convert("RGB")), index
