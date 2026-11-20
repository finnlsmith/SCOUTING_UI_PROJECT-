# routes/holds.py
"""
Players > Ball holding: what drives a player's four holding numbers, and what a hold costs.

Tables come from the dated S3 folder (settings.PFF_DERIVED_PREFIX), built by
`notebooks/build_app_holds_tables.py` with the card's definitions (ball_stopper.py): one row per release of the ball;
long hold = 4+ touches or 3+ s on the ball; very long = 6+ touches or 3.7+ s; idle = a long hold with no defender within 6 m.
"""
import io
import json
import logging
from functools import lru_cache

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException

from routes.players import _clean, _read_bytes
from routes.technique import _rate_split

router = APIRouter(tags=["Players"])
logger = logging.getLogger(__name__)

MIN_ACTIONS = 40            # the card ranks the holding rows only for players with 40+ actions
BAND_BINS, BAND_LABELS = [0, 3, 6, 999], ["Tight (under 3 m)", "Contested (3 to 6 m)", "Free (6+ m)"]
TOUCH_BUCKETS = ["1", "2", "3", "4", "5", "6+"]
WINDOW = 10


@lru_cache(maxsize=1)
def load_holds() -> pd.DataFrame:
    return pd.read_parquet(io.BytesIO(_read_bytes("holds_slim.parquet")))


@lru_cache(maxsize=1)
def load_hold_players() -> pd.DataFrame:
    return pd.read_parquet(io.BytesIO(_read_bytes("holds_players.parquet")))


@lru_cache(maxsize=1)
def load_hold_cost() -> dict:
    return json.loads(_read_bytes("hold_cost.json"))


def _bucket(touches: pd.Series) -> pd.Series:
    return touches.clip(upper=6).astype(int).astype(str).replace({"6": "6+"})


def _clock_s(period, clock):
    m, s = clock.split(":")
    return int(period) * 10000 + int(m) * 60 + int(s)


def player_holds(holds: pd.DataFrame, players: pd.DataFrame, cost: dict, pid: int) -> dict:
    row = players[players.pff_player_id == pid]
    if row.empty:
        raise KeyError(pid)
    me = row.iloc[0]
    pool = players[(players.peers == me.peers) & players.in_pool & (players.hold_actions >= MIN_ACTIONS)]
    H = holds[holds.pff_player_id.isin(set(pool.pff_player_id))].copy()
    mask = H.pff_player_id == pid
    mine = H[mask]
    if mine.empty:
        raise KeyError(pid)

    H["long_f"] = H.long.astype(float)
    H["band"] = pd.cut(H.nearest_m, BAND_BINS, labels=BAND_LABELS, right=False).astype(object)
    H["kind"] = np.where(H.action == "pass", "Pass", "Other action")
    H["route"] = np.select([H.long_t & H.long_s, H.long_t, H.long_s], ["Both", "Touches only", "Seconds only"], default="Not long")
    H["bucket"] = _bucket(H.touches)
    mine = H[mask]

    def share(d, col, keys):
        s = d[col].value_counts(normalize=True)
        return {k: float(s.get(k, 0.0)) for k in keys}

    n = len(mine)
    summary = {
        "actions": int(n), "long": int(mine.long.sum()), "very": int(mine.very.sum()), "idle": int(mine.idle.sum()),
        "mean_touches": float(mine.touches.mean()), "peer_mean_touches": float(H.touches.mean()),
        "mean_seconds": float(mine.time_on_ball.mean()), "peer_mean_seconds": float(H.time_on_ball.mean()),
        "long_rate": float(mine.long.mean()), "peer_long_rate": float(H.long.mean()),
    }
    dist = {"buckets": TOUCH_BUCKETS, "player": share(mine, "bucket", TOUCH_BUCKETS), "peers": share(H, "bucket", TOUCH_BUCKETS)}
    routes = {"keys": ["Touches only", "Seconds only", "Both"], "player": share(mine, "route", ["Touches only", "Seconds only", "Both"]),
              "peers": share(H, "route", ["Touches only", "Seconds only", "Both"])}

    tests, tables = {}, {}
    for name, col in (("space", "band"), ("kind", "kind")):
        sub = H.dropna(subset=[col])
        m = sub.pff_player_id == pid
        swap = _rate_split(sub, "long_f", col, m)
        tests[name] = {k: swap[k] for k in ("his_rate", "peer_rate", "his_rates_peer_mix", "peer_rates_his_mix")}
        tables[name] = swap["groups"]

    known = H.dropna(subset=["nearest_m"])
    free = known[known.nearest_m >= 6]
    free_me = free[free.pff_player_id == pid]
    idle = {
        "free_share": float((known[known.pff_player_id == pid].nearest_m >= 6).mean()), "peer_free_share": float((known.nearest_m >= 6).mean()),
        "free_actions": int(len(free_me)), "idle": int(free_me.idle.sum()),
        "idle_rate": None if free_me.empty else float(free_me.idle.mean()), "peer_idle_rate": float(free.idle.mean()),
    }

    pic = mine.dropna(subset=["time_on_ball"])
    picture = _clean(pic[["touches", "time_on_ball", "nearest_m", "long", "very", "idle"]].round(2))

    # ten consecutive actions from the match where he had most, the stretch with the most long holds
    match = mine.match.value_counts().index[0]
    m_rows = mine[mine.match == match].copy()
    m_rows["_t"] = [_clock_s(p, c) for p, c in zip(m_rows.period, m_rows.clock)]
    m_rows = m_rows.sort_values("_t").reset_index(drop=True)
    best, best_i = -1, 0
    for i in range(max(1, len(m_rows) - WINDOW + 1)):
        longs = int(m_rows.long.iloc[i:i + WINDOW].sum())
        if longs > best:
            best, best_i = longs, i
    ex = m_rows.iloc[best_i:best_i + WINDOW]
    examples = _clean(ex[["clock", "action", "touches", "time_on_ball", "nearest_m", "long", "very", "idle"]].round(1))

    return {
        "player": _clean(row[["pff_player_id", "peers", "matches", "minutes"]])[0],
        "pool_size": int(len(pool)), "summary": summary, "touches": dist, "routes": routes,
        "tests": tests, "tables": tables, "idle": idle,
        "picture": picture, "examples": examples, "example_match": match, "cost": cost,
    }


@router.get("/api/players/{pff_player_id}/holds", summary="What drives a player's ball holding numbers")
async def holds_for_player(pff_player_id: int):
    try:
        holds, players, cost = load_holds(), load_hold_players(), load_hold_cost()
    except Exception as e:
        logger.exception("Failed to load holds data")
        raise HTTPException(500, f"Failed to load holds data: {e}")
    try:
        return player_holds(holds, players, cost, pff_player_id)
    except KeyError:
        raise HTTPException(404, f"No hold data for player {pff_player_id}")
