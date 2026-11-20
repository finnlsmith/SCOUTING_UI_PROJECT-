# routes/great.py
"""
Players > Great actions: the card's third view (goals, assists, key passes, high-xG shots, each split by speed, space and time on
the ball), and how far a player's splits differ from everyone's.

Tables come from the dated S3 folder (settings.PFF_DERIVED_PREFIX), built by `notebooks/build_app_great_tables.py`: great_events
(every event with its readings) and great_tables (the card's table for every player, with the all-players reference). Counts, not
percentiles: one player has too few of these to rank.
"""
import io
import json
import logging
from functools import lru_cache

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException

from routes.players import _clean, _read_bytes
from routes.technique import wilson

router = APIRouter(tags=["Players"])
logger = logging.getLogger(__name__)

# split -> (the bucket that is counted, how many leading buckets are "known"); the last bucket is "unknown"
SPLITS = {
    "speed": {"label": "At 15+ km/h", "key": "speed", "count": 1, "known": 2},
    "space": {"label": "Defender within 3 m", "key": "space", "count": 0, "known": 2},
    "time": {"label": "Under 1.5 s on the ball", "key": "time", "count": 0, "known": 3},
}


@lru_cache(maxsize=1)
def load_great_events() -> pd.DataFrame:
    return pd.read_parquet(io.BytesIO(_read_bytes("great_events.parquet")))


@lru_cache(maxsize=1)
def load_great_tables() -> dict:
    return json.loads(_read_bytes("great_tables.json"))


def _share(counts, spec):
    known = sum(counts[: spec["known"]])
    return counts[spec["count"]], known, (counts[spec["count"]] / known if known else None)


def player_great(events: pd.DataFrame, tables: dict, pid: int) -> dict:
    rows = tables.get(str(pid))
    if rows is None:
        raise KeyError(pid)

    splits = []
    for r in rows:
        for name, spec in SPLITS.items():
            k, n, s = _share(r["me"][spec["key"]], spec)
            rk, rn, rs = _share(r["ref"][spec["key"]], spec)
            splits.append({
                "action": r["action"], "split": name, "label": spec["label"], "k": int(k), "known": int(n),
                "unknown": int(r["me"][spec["key"]][-1]), "share": s, "range": wilson(k, n) if n else None,
                "ref_share": rs, "ref_known": int(rn),
            })

    e = events[events.pff_player_id == pid].copy()
    e["tags"] = [", ".join(t for t, on in (("goal", g), ("assist", a), ("high xG", h)) if on) for g, a, h in zip(e.goal, e.assist, e.high_xg)]
    e["_o"] = e.match + e.clock.fillna("")
    events_out = _clean(e.sort_values("_o")[["match", "clock", "kind", "tags", "xg", "speed_kmh", "nearest_m", "time_on_ball"]].round(2))
    return {"rows": rows, "splits": splits, "events": events_out}


@router.get("/api/players/{pff_player_id}/great", summary="A player's great actions, with how they split")
async def great_for_player(pff_player_id: int):
    try:
        events, tables = load_great_events(), load_great_tables()
    except Exception as e:
        logger.exception("Failed to load great-actions data")
        raise HTTPException(500, f"Failed to load great-actions data: {e}")
    try:
        return player_great(events, tables, pff_player_id)
    except KeyError:
        raise HTTPException(404, f"No great-actions data for player {pff_player_id}")
