# routes/touches.py
"""
Players > Touches: what drives a player's touches per 90.

Tables come from the dated S3 folder (settings.PFF_DERIVED_PREFIX): free_touches / free_players (built by
`notebooks/build_app_free_tables.py`, the card's touches) and touches_matches (`build_app_touches_tables.py`).
A touch is one PFF game event on the ball in open play. Touches per 90 = touches / minutes x 90 = his team's touches per 90 while
he was on the pitch x his share of them.
"""
import io
import logging
from functools import lru_cache

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException

from routes.free import load_free_players, load_free_touches
from routes.players import _clean, _read_bytes

router = APIRouter(tags=["Players"])
logger = logging.getLogger(__name__)

ZONES = [-60, -17.5, 17.5, 60]
ZONE_LABELS = ["Own third", "Middle third", "Final third"]
NEXT = {"PA": "Pass", "CH": "Dribble or challenge", "CL": "Clearance", "RE": "Rebound", "SH": "Shot", "CR": "Cross", "BC": "Carry", "TC": "Touch"}
MIN_MINUTES = 20


@lru_cache(maxsize=1)
def load_touch_matches() -> pd.DataFrame:
    return pd.read_parquet(io.BytesIO(_read_bytes("touches_matches.parquet")))


def player_touches(touches: pd.DataFrame, players: pd.DataFrame, matches: pd.DataFrame, pid: int) -> dict:
    row = players[players.pff_player_id == pid]
    if row.empty:
        raise KeyError(pid)
    me = row.iloc[0]
    pool = players[(players.peers == me.peers) & players.in_pool].copy()
    ids = set(pool.pff_player_id)
    pool["p90"] = pool.touches / pool.minutes * 90
    pool["team90"] = pool.team_on / pool.minutes * 90
    pool["involve"] = pool.touches / pool.team_on * 100
    p = pool[pool.pff_player_id == pid].iloc[0]

    med_team90, med_inv, med_p90 = float(pool.team90.median()), float(pool.involve.median()), float(pool.p90.median())
    volume = {
        "touches": int(me.touches), "minutes": float(me.minutes), "per90": float(p.p90), "team90": float(p.team90), "involve": float(p.involve),
        "median_per90": med_p90, "median_team90": med_team90, "median_involve": med_inv,
        "his_share_on_median_tempo": float(p.involve / 100 * med_team90), "median_share_on_his_tempo": float(med_inv / 100 * p.team90),
        "team90_below": int((pool.team90 < p.team90).sum()), "pool_size": int(len(pool)),
        "correlation": float(pool.p90.corr(pool.team90)),
        "peers": [{"team90": round(float(a), 1), "involve": round(float(b), 3), "per90": round(float(c), 1), "me": bool(i == pid)}
                  for i, a, b, c in zip(pool.pff_player_id, pool.team90, pool.involve, pool.p90)],
    }

    # ---- where the touches come from: per 90 in each third
    T = touches[touches.pff_player_id.isin(ids)].copy()
    T["zone"] = pd.cut(T.x_att, ZONES, labels=ZONE_LABELS).astype(object)
    z = T.groupby(["pff_player_id", "zone"]).size().unstack(fill_value=0).reindex(pool.pff_player_id).fillna(0)
    z90 = z.div(pool.set_index("pff_player_id").minutes, axis=0) * 90
    zones = {"labels": ZONE_LABELS, "player": {k: float(z90.loc[pid, k]) for k in ZONE_LABELS},
             "peers": {k: float(z90[k].mean()) for k in ZONE_LABELS}, "median": {k: float(z90[k].median()) for k in ZONE_LABELS}}

    # ---- what a touch leads to
    mine = T[T.pff_player_id == pid]
    keys = ["PA", "CH", "CL", "RE", "SH", "CR", "BC", "TC"]
    nxt = {"keys": [NEXT[k] for k in keys],
           "player": {NEXT[k]: float((mine.last_kind == k).mean()) for k in keys},
           "peers": {NEXT[k]: float((T.last_kind == k).mean()) for k in keys}}

    # ---- match by match
    M = matches[matches.pff_player_id.isin(ids) & (matches.minutes >= MIN_MINUTES)].copy()
    M["per90"] = M.touches / M.minutes * 90
    mm = M[M.pff_player_id == pid].sort_values("match")
    by_match = {"median_per90": float(M.per90.median()),
                "rows": _clean(mm.assign(team90=mm.team_on / mm.minutes * 90)[["match", "minutes", "touches", "per90", "team90"]].round(1))}

    # ---- is it his team? team tempo for every team, and his team's midfielders
    allM = matches.copy()
    allM["t90"] = allM.team_touches / allM.match_len * 90
    teams = allM.drop_duplicates(["game_id", "team"]).groupby("team").t90.mean()
    team_info = None
    if pd.notna(me.team) and me.team in teams.index:
        mates = pool[pool.team == me.team].sort_values("p90", ascending=False)
        team_info = {
            "team": me.team, "tempo": float(teams[me.team]), "rank": int(list(teams.sort_values(ascending=False).index).index(me.team) + 1),
            "teams": int(len(teams)), "median_tempo": float(teams.median()),
            "other_midfielders_median": float(pool[pool.team != me.team].p90.median()),
            "midfielders": [{"name": n, "per90": float(v), "minutes": float(m), "me": bool(i == pid)}
                            for i, n, v, m in zip(mates.pff_player_id, mates.name, mates.p90, mates.minutes)],
        }

    pic = _clean(mine[["x_att", "y_att", "last_kind"]].round(1))
    near = mine.assign(zone=pd.cut(mine.x_att, ZONES, labels=ZONE_LABELS).astype(object))
    match = near.match.value_counts().index[0]
    ex = near[near.match == match].head(8)
    examples = _clean(ex.assign(space_m=ex.nearest_opp_m.round(1), kind=ex.last_kind.map(NEXT))[["zone", "space_m", "kind", "outcome"]])
    return {
        "player": _clean(row[["pff_player_id", "name", "peers", "matches", "minutes"]])[0], "volume": volume, "zones": zones, "next": nxt,
        "by_match": by_match, "team": team_info, "points": pic, "examples": examples, "example_match": match,
    }


@router.get("/api/players/{pff_player_id}/touches", summary="What drives a player's touches per 90")
async def touches_for_player(pff_player_id: int):
    try:
        touches, players, matches = load_free_touches(), load_free_players(), load_touch_matches()
    except Exception as e:
        logger.exception("Failed to load touches data")
        raise HTTPException(500, f"Failed to load touches data: {e}")
    try:
        return player_touches(touches, players, matches, pff_player_id)
    except KeyError:
        raise HTTPException(404, f"No touches data for player {pff_player_id}")
