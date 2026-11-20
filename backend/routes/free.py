# routes/free.py
"""
Players > Free space: what drives a player's five free-space numbers.

Tables come from the dated S3 folder (settings.PFF_DERIVED_PREFIX), built by `notebooks/build_app_free_tables.py` with the
card's definitions: a touch is free when the nearest opponent is 6+ m away as he gets the ball; per 100 team touches uses his
team's touches while he was on the pitch; outcome positive / neutral / negative = progressive / kept / lost.
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

MIN_DECISIONS = 15
ZONES = [-60, -17.5, 17.5, 60]
ZONE_LABELS = ["Own third", "Middle third", "Final third"]
SPACE = [6, 9, 12, 999]
SPACE_LABELS = ["6 to 9 m", "9 to 12 m", "12+ m"]
CHANCE = {"SH": "Shot", "CR": "Completed cross"}


@lru_cache(maxsize=1)
def load_free_touches() -> pd.DataFrame:
    return pd.read_parquet(io.BytesIO(_read_bytes("free_touches.parquet")))


@lru_cache(maxsize=1)
def load_free_players() -> pd.DataFrame:
    return pd.read_parquet(io.BytesIO(_read_bytes("free_players.parquet")))


def _kind(row) -> str:
    if row.key_pass:
        return "Key pass"
    return CHANCE.get(row.last_kind, row.last_kind)


def player_free(touches: pd.DataFrame, players: pd.DataFrame, pid: int) -> dict:
    row = players[players.pff_player_id == pid]
    if row.empty:
        raise KeyError(pid)
    me = row.iloc[0]
    pool = players[(players.peers == me.peers) & players.in_pool].copy()
    ids = set(pool.pff_player_id)
    T = touches[touches.pff_player_id.isin(ids)].copy()
    mine = T[T.pff_player_id == pid]
    if mine.empty:
        raise KeyError(pid)

    T["free"] = T.nearest_opp_m >= 6
    T["freef"] = T.free.astype(float)
    T["zone"] = pd.cut(T.x_att, ZONES, labels=ZONE_LABELS).astype(object)
    T["space"] = pd.cut(T.nearest_opp_m, SPACE, labels=SPACE_LABELS, right=False).astype(object)
    mine = T[T.pff_player_id == pid]

    # ---- free receptions per 100 team touches = involvement x share of touches in free space
    pool["involve"] = pool.touches / pool.team_on * 100
    pool["share"] = pool.free_receptions / pool.free_known
    pool["per100"] = pool.free_receptions / pool.team_on * 100
    p = pool[pool.pff_player_id == pid].iloc[0]
    volume = {
        "touches": int(me.touches), "free": int(me.free_receptions), "known": int(me.free_known), "team_on": float(me.team_on),
        "involve": float(p.involve), "share": float(p.share), "per100": float(p.per100),
        "median_involve": float(pool.involve.median()), "median_share": float(pool["share"].median()), "median_per100": float(pool.per100.median()),
        "his_involve_on_median_share": float(p.involve * pool["share"].median()), "median_involve_on_his_share": float(pool.involve.median() * p["share"]),
        "peer_share_pooled": float(T.freef.mean()),
        "peers": [{"involve": round(float(a), 2), "share": round(float(b), 4), "me": bool(i == pid)}
                  for i, a, b in zip(pool.pff_player_id, pool.involve, pool["share"])],
    }

    # ---- where he gets free touches
    swap = _rate_split(T.dropna(subset=["zone"]), "freef", "zone", T.dropna(subset=["zone"]).pff_player_id == pid)
    zone_groups = sorted(swap["groups"], key=lambda g: ZONE_LABELS.index(g["group"]))
    zone = {"groups": zone_groups, **{k: swap[k] for k in ("his_rate", "peer_rate", "his_rates_peer_mix", "peer_rates_his_mix")}}

    # ---- is it his team?
    allT = touches.copy()
    allT["free"] = allT.nearest_opp_m >= 6
    teams = allT.dropna(subset=["team"]).groupby("team").free.mean()
    team_info = None
    if pd.notna(me.team) and me.team in teams.index:
        mates = pool[pool.team == me.team].sort_values("share", ascending=False)
        others = pool[pool.team != me.team]
        team_info = {
            "team": me.team, "share": float(teams[me.team]), "rank": int(list(teams.sort_values(ascending=False).index).index(me.team) + 1),
            "teams": int(len(teams)), "median_team_share": float(teams.median()),
            "other_midfielders_median": float(others["share"].median()),
            "midfielders": [{"name": n, "share": float(s), "touches": int(k), "me": bool(i == pid)}
                            for i, n, s, k in zip(mates.pff_player_id, mates.name, mates["share"], mates.touches)],
        }

    # ---- what he does with free space (the card ranks these against players with 15+ decisions)
    fids = set(pool[pool.free_decisions >= MIN_DECISIONS].pff_player_id)
    F = T[T.pff_player_id.isin(fids) & T.free & T.outcome.ne("other")].copy()
    mf = F.pff_player_id == pid
    for code in ("positive", "neutral", "negative"):
        F[code] = (F.outcome == code).astype(float)
    outcomes = [{"outcome": label, "k": int(F[mf][code].sum()), "n": int(mf.sum()), "rate": float(F[mf][code].mean()) if mf.any() else None,
                 "peer_rate": float(F[code].mean())} for code, label in (("positive", "Progressive"), ("neutral", "Kept"), ("negative", "Lost"))]
    tests, tables = {}, {}
    for name, col in (("zone", "zone"), ("space", "space")):
        sub = F.dropna(subset=[col])
        m = sub.pff_player_id == pid
        tests[name] = {}
        for code in ("positive", "negative"):
            s = _rate_split(sub, code, col, m)
            tests[name][code] = {k: s[k] for k in ("his_rate", "peer_rate", "his_rates_peer_mix", "peer_rates_his_mix")}
            if code == "positive" and name == "zone":
                tables["zone"] = sorted(s["groups"], key=lambda g: ZONE_LABELS.index(g["group"]))

    # ---- chances from free space, the pictures and the rows
    ch = mine[mine.free & mine.chance]
    chances = _clean(pd.DataFrame([{"kind": _kind(r), "match": r.match, "space_m": round(float(r.nearest_opp_m), 1), "outcome": r.outcome} for r in ch.itertuples()]))
    pic = mine[["x_att", "y_att", "nearest_opp_m", "outcome"]].round(1)
    pic = pic.assign(free=pic.nearest_opp_m >= 6)
    free_mine = mine[mine.free]
    match = free_mine.match.value_counts().index[0] if len(free_mine) else None
    ex = free_mine[free_mine.match == match].head(8) if match else free_mine.head(0)
    examples = _clean(ex.assign(space_m=ex.nearest_opp_m.round(1))[["zone", "space_m", "outcome", "last_kind"]]) if match else []

    return {
        "player": _clean(row[["pff_player_id", "name", "peers", "matches", "minutes"]])[0], "pool_size": int(len(pool)),
        "volume": volume, "zone": zone, "team": team_info, "outcomes": outcomes, "tests": tests, "tables": tables,
        "chances": chances, "points": _clean(pic), "examples": examples, "example_match": match,
    }


@router.get("/api/players/{pff_player_id}/free", summary="What drives a player's free-space numbers")
async def free_for_player(pff_player_id: int):
    try:
        touches, players = load_free_touches(), load_free_players()
    except Exception as e:
        logger.exception("Failed to load free-space data")
        raise HTTPException(500, f"Failed to load free-space data: {e}")
    try:
        return player_free(touches, players, pff_player_id)
    except KeyError:
        raise HTTPException(404, f"No free-space data for player {pff_player_id}")
