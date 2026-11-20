# routes/rows.py
"""
Players > any chapter: every row of the player card, with the arithmetic behind its percentile.

Tables come from the dated S3 folder (settings.PFF_DERIVED_PREFIX), built by
`notebooks/build_app_card_rows.py` in the Playing at Speed project. That script runs the card generator and
records what each row was ranked against, and checks it can rebuild the card's percentile for every row.
"""
import io
import json
import logging
from functools import lru_cache

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException

from routes.players import _clean, _read_bytes

router = APIRouter(tags=["Players"])
logger = logging.getLogger(__name__)

Z90 = 1.645


@lru_cache(maxsize=1)
def load_card_rows() -> pd.DataFrame:
    return pd.read_parquet(io.BytesIO(_read_bytes("card_rows.parquet")))


@lru_cache(maxsize=1)
def load_card_pools() -> dict:
    return json.loads(_read_bytes("card_pools.json"))


def rank_in_pool(pool, v, invert=False) -> dict:
    """Same rule as the card's pct_rank: peers beaten (+ half for level) over the pool size.
    For lower-is-better rows the values are negated first, so `below` counts peers with a HIGHER value."""
    p = -np.asarray(pool, dtype=float) if invert else np.asarray(pool, dtype=float)
    x = -v if invert else v
    below, equal = int((p < x).sum()), int((p == x).sum())
    above = int(len(p) - below - equal)
    return {"below": below, "equal": equal, "above": above, "pool_size": int(len(p)),
            "exact": None if len(p) == 0 else 100 * (below + 0.5 * equal) / len(p)}


def player_rows(rows: pd.DataFrame, pools: dict, pff_player_id: int) -> dict:
    mine = rows[rows.pff_player_id == pff_player_id]
    if mine.empty:
        raise KeyError(pff_player_id)
    first = mine.iloc[0]
    out = []
    for r in mine.itertuples():
        item = {
            "section": r.section, "label": r.label, "val": r.val, "v": None if pd.isna(r.v) else float(r.v),
            "n": None if pd.isna(r.n) else int(r.n), "range": r.rng or None,
            "percentile": None if pd.isna(r.pct) else int(r.pct),
            "need": None if pd.isna(r.need) else int(r.need), "settled": bool(r.settled), "not_ranked": bool(r.np),
            "judge": bool(r.judge), "lower_is_better": bool(r.invert), "rank": None, "peer_median": None, "peer_values": [],
        }
        pool = pools.get(first.peers, {}).get(r.label)
        if r.has_pool and pool and not pd.isna(r.v):
            item["rank"] = rank_in_pool(pool, float(r.v), bool(r.invert))
            item["peer_median"] = float(np.median(pool))
            item["peer_values"] = pool
        out.append(item)
    return {
        "player": {"pff_player_id": int(pff_player_id), "name": first["name"], "peers": first.peers,
                   "matches": int(first.matches), "minutes": float(first.minutes)},
        "rows": out,
    }


@router.get("/api/players/rows/players", summary="Players who have a card")
async def rows_players():
    try:
        rows = load_card_rows()
    except Exception as e:
        logger.exception("Failed to load card rows")
        raise HTTPException(500, f"Failed to load card rows: {e}")
    p = rows.drop_duplicates("pff_player_id")[["pff_player_id", "name", "peers", "matches"]]
    return _clean(p[p.matches >= 4].sort_values("name"))


@router.get("/api/players/{pff_player_id}/rows", summary="Every card row for a player, with ranking arithmetic")
async def rows_for_player(pff_player_id: int):
    try:
        rows, pools = load_card_rows(), load_card_pools()
    except Exception as e:
        logger.exception("Failed to load card rows")
        raise HTTPException(500, f"Failed to load card rows: {e}")
    try:
        return player_rows(rows, pools, pff_player_id)
    except KeyError:
        raise HTTPException(404, f"No card for player {pff_player_id}")
