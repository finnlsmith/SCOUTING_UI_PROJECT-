"""Registry of the football data sources that live in S3."""
import json
import os
from pathlib import Path
from typing import Dict, List, Optional

REGISTRY_PATH = Path(__file__).with_name("registry.json")

# Fields safe to show to API clients (local paths and notes stay server-side).
PUBLIC_FIELDS = (
    "id", "name", "kind", "provider", "description", "tracking", "events",
    "sample_size", "license", "private_only", "approx_size_gb", "notes",
)


def _load() -> dict:
    with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def s3_prefix_root() -> str:
    return _load().get("s3_prefix_root", "datasets")


def all_sources() -> List[dict]:
    return _load()["sources"]


def get_source(source_id: str) -> Optional[dict]:
    for src in all_sources():
        if src["id"] == source_id:
            return src
    return None


def s3_prefix(source: dict) -> str:
    """S3 key prefix (with trailing slash) for a source."""
    return f"{s3_prefix_root()}/{source['id']}/"


def is_uploadable(source: dict) -> bool:
    """True when the source has local files that belong in S3."""
    return bool(source.get("local_path"))


def serve_private() -> bool:
    """Whether the API may serve sources flagged private_only.
    Defaults to true because the app is private. Set DATASETS_SERVE_PRIVATE=false to block them."""
    return os.getenv("DATASETS_SERVE_PRIVATE", "true").strip().lower() not in ("0", "false", "no")


def public_view(source: dict) -> Dict:
    view = {k: source.get(k) for k in PUBLIC_FIELDS}
    view["s3_prefix"] = s3_prefix(source)
    view["uploadable"] = is_uploadable(source)  # False for sources that must be cloned/downloaded first
    if source.get("source_url"):
        view["source_url"] = source["source_url"]
    return view
