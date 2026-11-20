# routes/standard.py
"""
Players > Standard stats: goals, assists, key passes and high-xG shots, ranked per 90 minutes.

Counts come from great_events (notebooks/build_app_great_tables.py, the card's own events) and minutes from free_players.
Goals = shots that went in; assists = key passes before a goal; key passes = passes that led to a shot; high-xG = shots with a
naive xG (distance and angle) of 0.15 or more. The card ranks the per-90 rate against peers, level players counting half.
"""
import logging

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException

from routes.free import load_free_players
from routes.great import load_great_events
from routes.players import _clean

router = APIRouter(tags=["Players"])
logger = logging.getLogger(__name__)

STATS = [
    ("Goals", "goals", lambda e: e.goal & e.kind.eq("shot")),
    ("Assists", "assists", lambda e: e.assist & e.kind.eq("key pass")),
    ("Key passes", "key passes", lambda e: e.kind.eq("key pass")),
    ("High-xG shots", "high-xG shots", lambda e: e.high_xg.astype(bool)),
]
SMALL_BUCKETS = [("0", 0, 0), ("1", 1, 1), ("2", 2, 2), ("3+", 3, 999)]
KEY_BUCKETS = [("0", 0, 0), ("1 to 2", 1, 2), ("3 to 4", 3, 4), ("5 to 6", 5, 6), ("7 to 8", 7, 8), ("9+", 9, 999)]
WHAT_IF = {"Goals": [0, 1, 2, 3], "Assists": [0, 1, 2, 3], "Key passes": [3, 5, 7, 9, 11], "High-xG shots": [0, 1, 2, 3]}


def _percentile(values: np.ndarray, x: float) -> int:
    below, equal = (values < x).sum(), (values == x).sum()
    return int(round(100 * (below + 0.5 * equal) / len(values)))


def player_standard(events: pd.DataFrame, players: pd.DataFrame, pid: int) -> dict:
    row = players[players.pff_player_id == pid]
    if row.empty:
        raise KeyError(pid)
    me = row.iloc[0]
    pool = players[(players.peers == me.peers) & players.in_pool].set_index("pff_player_id")
    if pid not in pool.index:
        raise KeyError(pid)
    minutes = pool.minutes
    idx = list(pool.index).index(pid)

    stats = []
    for label, name, sel in STATS:
        counts = events[sel(events)].groupby("pff_player_id").size().reindex(pool.index).fillna(0)
        r90 = (counts / minutes * 90).to_numpy()
        mine, my90 = int(counts[pid]), float(counts[pid] / minutes[pid] * 90)
        buckets = KEY_BUCKETS if label == "Key passes" else SMALL_BUCKETS
        dist = [{"bucket": b, "n": int(((counts >= lo) & (counts <= hi)).sum()), "me": bool(lo <= mine <= hi)} for b, lo, hi in buckets]
        what_if = []
        for n in WHAT_IF[label]:
            v = r90.copy()
            v[idx] = n / minutes[pid] * 90
            what_if.append({"count": n, "percentile": _percentile(v, v[idx]), "actual": bool(n == mine)})
        stats.append({
            "label": label, "name": name, "count": mine, "per90": my90, "percentile": _percentile(r90, my90),
            "zero": int((counts == 0).sum()), "max": int(counts.max()), "median_count": float(counts.median()), "mean_count": float(counts.mean()),
            "median_per90": float(np.median(r90)), "distribution": dist, "what_if": what_if,
        })

    mine_e = events[events.pff_player_id == pid].copy()
    shots = mine_e[mine_e.kind == "shot"]
    xg = {"shots": int(len(shots)), "xg_total": float(shots.xg.sum()), "goals": int(shots.goal.sum()),
          "high_xg_shots": int(shots.high_xg.sum())}
    keep = mine_e[(mine_e.kind == "key pass") | mine_e.goal | mine_e.high_xg.astype(bool)].copy()
    keep["tags"] = [", ".join(t for t, on in (("goal", g), ("assist", a), ("high xG", h)) if on) for g, a, h in zip(keep.goal, keep.assist, keep.high_xg)]
    keep["_o"] = keep.kind + keep.match + keep.clock.fillna("")
    events_out = _clean(keep.sort_values("_o", ascending=False)[["match", "clock", "kind", "tags", "xg"]].round(2))
    return {
        "player": _clean(row[["pff_player_id", "name", "peers", "matches", "minutes"]])[0], "pool_size": int(len(pool)),
        "stats": stats, "xg": xg, "events": events_out,
    }


@router.get("/api/players/{pff_player_id}/standard", summary="What drives a player's standard stats")
async def standard_for_player(pff_player_id: int):
    try:
        events, players = load_great_events(), load_free_players()
    except Exception as e:
        logger.exception("Failed to load standard-stats data")
        raise HTTPException(500, f"Failed to load standard-stats data: {e}")
    try:
        return player_standard(events, players, pff_player_id)
    except KeyError:
        raise HTTPException(404, f"No standard-stats data for player {pff_player_id}")
