"""Save every API response the Players section can ask for into one JSON file, so the section can run as a single offline HTML file.

Needs the backend running (default http://localhost:8000/api). Writes <out>: {"/players/...": response, ...}; pages read it instead of fetching.
Usage: python scripts/snapshot_players.py <out.json> [backend_url]
"""
import json
import re
import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

OUT = Path(sys.argv[1])
BASE = (sys.argv[2] if len(sys.argv) > 2 else "http://localhost:8000/api").rstrip("/")
SRC = Path(__file__).resolve().parent.parent / "frontend/src/components/PlayersPage"
PER_PLAYER = ["rows", "pace", "volume", "touches", "time", "technique", "standard", "holds", "goalside", "great", "free", "flip", "booth"]
LISTS = ["/players/rows/players", "/players/technique/players", "/players/pace/players?ranked_only=true", "/players/pace/demo"]


def get(path):
    try:
        with urllib.request.urlopen(BASE + path, timeout=120) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError:
        return None


def main():
    # card slugs named anywhere in the page code
    slugs = set()
    for f in SRC.glob("*.js"):
        slugs |= set(re.findall(r'(?:example: |EXAMPLE_CARD = |DEFAULT_CARD = |card/)"([a-z_]+)"', f.read_text()))
    out = {p: get(p) for p in LISTS}
    out = {p: v for p, v in out.items() if v is not None}
    ids = set()
    for p in LISTS[:3]:
        for row in out.get(p, []):
            ids.add(row["pff_player_id"])
    paths = [f"/players/card/{s}" for s in sorted(slugs)] + [f"/players/{i}/{k}" for i in sorted(ids) for k in PER_PLAYER]
    with ThreadPoolExecutor(8) as ex:
        for p, v in zip(paths, ex.map(get, paths)):
            if v is not None:
                out[p] = v
    OUT.write_text(json.dumps(out, separators=(",", ":")))
    print(f"{len(out)} responses ({len(paths)} asked), {OUT.stat().st_size / 1e6:.1f} MB; cards: {sorted(slugs)}; players: {len(ids)}")


if __name__ == "__main__":
    main()
