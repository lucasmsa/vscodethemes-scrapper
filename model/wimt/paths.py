from pathlib import Path

MODEL_DIR = Path(__file__).resolve().parent.parent
ROOT = MODEL_DIR.parent
RENDERS = ROOT / "renders"
QUERIES = ROOT / "eval" / "queries"
RUNS = MODEL_DIR / "runs"
REPORT = ROOT / "eval" / "report.json"
THEMES_JSON = ROOT / "data" / "themes.json"
THEMES_GZ = ROOT / "data" / "themes.json.gz"


def read_themes() -> list[dict]:
    """The dataset is committed gzipped; a plain file is used when present."""
    import gzip
    import json

    if THEMES_JSON.exists():
        return json.loads(THEMES_JSON.read_text())
    with gzip.open(THEMES_GZ, "rt") as handle:
        return json.load(handle)
