# routes/booth.py
"""
Players > Phone booth: what drives a player's four booth numbers.

Tables come from the dated S3 folder (settings.PFF_DERIVED_PREFIX), built by
`notebooks/build_app_booth_tables.py` with the card's own definitions (a touch in the booth zone with an opponent
within 3 m; outcome progressive / kept / lost; clearances and loose touches left out of the three shares).
"""
import io
import logging
from functools import lru_cache

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException

from routes.players import _clean, _read_bytes
from routes.technique import _rate_split

router = APIRouter(tags=["Players"])
logger = logging.getLogger(__name__)

MIN_DECISIONS = 15           # the card ranks the outcome rows only for players with 15+ decisions
ZONE_BINS = [-18, 0, 12, 28]
ZONE_LABELS = ["Deep", "Middle", "Advanced"]
CLOSE_BINS = [0, 1.5, 3.01]
CLOSE_LABELS = ["0 to 1.5 m", "1.5 to 3 m"]
OUTCOMES = {"positive": "Progressive", "neutral": "Kept", "negative": "Lost"}


@lru_cache(maxsize=1)
def load_booth_touches() -> pd.DataFrame:
    return pd.read_parquet(io.BytesIO(_read_bytes("booth_touches.parquet")))


@lru_cache(maxsize=1)
def load_booth_players() -> pd.DataFrame:
    return pd.read_parquet(io.BytesIO(_read_bytes("booth_players.parquet")))


def _swap(df, flag, col, mask):
    """His rate and the peers' rate for `flag`, plus the two swap-one-ingredient numbers for grouping `col`."""
    s = _rate_split(df, flag, col, mask)
    return {k: s[k] for k in ("his_rate", "peer_rate", "his_rates_peer_mix", "peer_rates_his_mix")}, s["groups"]


def player_booth(touches: pd.DataFrame, players: pd.DataFrame, pid: int) -> dict:
    row = players[players.pff_player_id == pid]
    if row.empty:
        raise KeyError(pid)
    me = row.iloc[0]
    pool = players[(players.peers == me.peers) & players.in_pool]

    # ---- volume: booth receptions per 90 = touches per 90 x booth share of touches
    v = pool.assign(share=pool.booth_receptions / pool.touches, t90=pool.touches / pool.minutes * 90,
                    b90=pool.booth_receptions / pool.minutes * 90)
    my_share, my_t90 = me.booth_receptions / me.touches, me.touches / me.minutes * 90
    volume = {
        "touches": int(me.touches), "booth": int(me.booth_receptions), "minutes": float(me.minutes),
        "t90": float(my_t90), "share": float(my_share), "b90": float(me.booth_receptions / me.minutes * 90),
        "median_t90": float(v.t90.median()), "median_share": float(v.share.median()), "median_b90": float(v.b90.median()),
        "share_below": int((v.share < my_share).sum()), "pool_size": int(len(v)),
        "his_touches_on_median_share": float(my_t90 * v.share.median()),
        "median_touches_on_his_share": float(v.t90.median() * my_share),
        "peers": [{"t90": round(float(a), 3), "share": round(float(b), 4), "me": bool(i == pid)}
                  for i, a, b in zip(v.pff_player_id, v.t90, v.share)],
    }

    # ---- outcomes: peers are the players the card ranks the outcome rows against
    ids = set(pool[pool.booth_decisions >= MIN_DECISIONS].pff_player_id)
    dec = touches[touches.pff_player_id.isin(ids) & touches.outcome.ne("other")].copy()
    dec["zone"] = pd.cut(dec.x_att, ZONE_BINS, labels=ZONE_LABELS).astype(object)
    dec["closeness"] = pd.cut(dec.nearest_opp_m, CLOSE_BINS, labels=CLOSE_LABELS).astype(object)
    mine = dec.pff_player_id == pid
    outcomes = []
    for code, label in OUTCOMES.items():
        dec[code] = (dec.outcome == code).astype(float)
        outcomes.append({"outcome": label, "k": int(dec[mine][code].sum()), "n": int(mine.sum()),
                         "rate": None if not mine.any() else float(dec[mine][code].mean()), "peer_rate": float(dec[code].mean())})

    tests = {}
    tables = {}
    for name, col in (("zone", "zone"), ("closeness", "closeness"), ("pressure", "pressure"), ("phase", "phase")):
        sub = dec.dropna(subset=[col])
        m = sub.pff_player_id == pid
        if not m.any():
            continue
        tests[name] = {}
        for code in ("positive", "negative"):
            swap, groups = _swap(sub, code, col, m)
            tests[name][code] = swap
            if code == "negative" and name in ("zone", "closeness"):
                tables[name] = groups

    # ---- the picture: his booth touches, and a few as rows
    mine_all = touches[touches.pff_player_id == pid]
    pic = mine_all[["x_att", "y_att", "outcome", "last_kind", "nearest_opp_m", "match", "gain_m", "completed"]]
    if mine_all.empty:
        examples, example_match = [], None
    else:
        example_match = mine_all.match.value_counts().index[0]
        examples = _clean(mine_all[mine_all.match == example_match].head(8)[
            ["nearest_opp_m", "pressure", "last_kind", "completed", "gain_m", "outcome"]].round(1))

    return {
        "player": _clean(row[["pff_player_id", "peers", "matches", "minutes"]])[0],
        "volume": volume, "outcomes": outcomes, "tests": tests, "tables": tables,
        "touches": _clean(pic.round(2)), "examples": examples, "example_match": example_match,
    }


@router.get("/api/players/{pff_player_id}/booth", summary="What drives a player's phone booth numbers")
async def booth_for_player(pff_player_id: int):
    try:
        touches, players = load_booth_touches(), load_booth_players()
    except Exception as e:
        logger.exception("Failed to load booth data")
        raise HTTPException(500, f"Failed to load booth data: {e}")
    try:
        return player_booth(touches, players, pff_player_id)
    except KeyError:
        raise HTTPException(404, f"No player with id {pff_player_id}")
