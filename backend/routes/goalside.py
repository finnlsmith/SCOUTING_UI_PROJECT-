# routes/goalside.py
"""
Players > Goal-side: what drives a forward's goal-side numbers.

Tables come from the dated S3 folder (settings.PFF_DERIVED_PREFIX), built by `notebooks/build_app_goalside_tables.py` with the card's
definitions: at each open-play touch, margin = (the nearest outfield opponent's distance to goal) - (his own distance to goal), from the
positions PFF attaches to the event; goal-side = margin > 0; the goalkeeper is left out. Progressive = the touch's outcome was positive.
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

ZONES = [-60, -17.5, 17.5, 60]
ZONE_LABELS = ["Own third", "Middle third", "Final third"]
MIN_TOUCHES = 20            # the card ranks the share only with 20+ touches
ROLE_ORDER = ["striker", "attacking mid", "wide forward", "wide midfielder"]


@lru_cache(maxsize=1)
def load_goalside_touches() -> pd.DataFrame:
    return pd.read_parquet(io.BytesIO(_read_bytes("goalside_touches.parquet")))


@lru_cache(maxsize=1)
def load_goalside_players() -> pd.DataFrame:
    return pd.read_parquet(io.BytesIO(_read_bytes("goalside_players.parquet")))


@lru_cache(maxsize=1)
def load_goalside_examples() -> list:
    return json.loads(_read_bytes("goalside_examples.json"))


def player_goalside(touches: pd.DataFrame, players: pd.DataFrame, examples: list, pid: int) -> dict:
    row = players[players.pff_player_id == pid]
    if row.empty:
        raise KeyError(pid)
    me = row.iloc[0]
    pool = players[(players.peers == me.peers) & players.in_pool].copy()
    pool["t90"] = pool.gs_touches / pool.minutes * 90
    pool["share"] = pool.goalside_share
    p = pool[pool.pff_player_id == pid].iloc[0]
    if pd.isna(p.share):
        raise KeyError(pid)

    ranked = pool.dropna(subset=["share"])
    med_t90, med_share = float(ranked.t90.median()), float(ranked.share.median())
    volume = {
        "touches": int(me.gs_touches), "goalside": int(me.gs_receptions), "minutes": float(me.minutes),
        "t90": float(p.t90), "share": float(p.share), "per90": float(p.goalside_per90),
        "median_t90": med_t90, "median_share": med_share, "median_per90": float(ranked.goalside_per90.median()),
        "his_t90_on_median_share": float(p.t90 * med_share), "median_t90_on_his_share": float(med_t90 * p.share),
        "pool_size": int(len(ranked)),
        "peers": [{"t90": round(float(a), 1), "share": round(float(b), 4), "me": bool(i == pid)}
                  for i, a, b in zip(ranked.pff_player_id, ranked.t90, ranked.share)],
    }

    # ---- is it his role?
    roles = ranked.groupby("role").share.agg(["median", "size"]).reindex(ROLE_ORDER).dropna()
    role_info = {"role": me.role, "position": me.position,
                 "groups": [{"role": r, "median_share": float(v["median"]), "n": int(v["size"]), "me": bool(r == me.role)} for r, v in roles.iterrows()],
                 "role_median": float(ranked[ranked.role == me.role].share.median()), "role_n": int((ranked.role == me.role).sum())}

    # ---- is it where on the pitch?
    T = touches[touches.pff_player_id.isin(set(pool.pff_player_id))].copy()
    T["zone"] = pd.cut(T.x_att, ZONES, labels=ZONE_LABELS).astype(object)
    T["gsf"] = T.goalside.astype(float)
    sub = T.dropna(subset=["zone"])
    swap = _rate_split(sub, "gsf", "zone", sub.pff_player_id == pid)
    zone = {"groups": sorted(swap["groups"], key=lambda g: ZONE_LABELS.index(g["group"])),
            **{k: swap[k] for k in ("his_rate", "peer_rate", "his_rates_peer_mix", "peer_rates_his_mix")}}

    # ---- is it his team? every attacker of his team in the pool
    team_info = None
    if pd.notna(me.team):
        mates = ranked[ranked.team == me.team].sort_values("share", ascending=False)
        others = ranked[ranked.team != me.team]
        team_info = {"team": me.team, "other_median": float(others.share.median()),
                     "attackers": [{"name": n, "role": r, "position": ps, "share": float(s), "touches": int(k), "me": bool(i == pid)}
                                   for i, n, r, ps, s, k in zip(mates.pff_player_id, mates.name, mates.role, mates.position, mates.share, mates.gs_touches)]}

    # ---- does being goal-side lead to progress?
    D = T[T.outcome.ne("other")].copy()
    D["prog"] = (D.outcome == "positive").astype(float)
    mine = D[D.pff_player_id == pid]
    prog = {}
    for name, flag in (("goalside", True), ("behind", False)):
        a, b = mine[mine.goalside == flag], D[D.goalside == flag]
        prog[name] = {"n": int(len(a)), "k": int(a.prog.sum()), "rate": None if a.empty else float(a.prog.mean()), "peer_rate": float(b.prog.mean())}

    mine_t = T[T.pff_player_id == pid]
    return {
        "player": _clean(row[["pff_player_id", "name", "peers", "role", "position", "matches", "minutes"]])[0],
        "volume": volume, "role": role_info, "zone": zone, "team": team_info, "progressive": prog,
        "points": _clean(mine_t[["x_att", "y_att", "goalside"]].round(1)), "examples": examples,
    }


@router.get("/api/players/{pff_player_id}/goalside", summary="What drives a forward's goal-side numbers")
async def goalside_for_player(pff_player_id: int):
    try:
        touches, players, examples = load_goalside_touches(), load_goalside_players(), load_goalside_examples()
    except Exception as e:
        logger.exception("Failed to load goal-side data")
        raise HTTPException(500, f"Failed to load goal-side data: {e}")
    try:
        return player_goalside(touches, players, examples, pff_player_id)
    except KeyError:
        raise HTTPException(404, f"No goal-side data for player {pff_player_id}")
