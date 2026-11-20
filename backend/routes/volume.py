# routes/volume.py
"""
Players > Action volume: what drives a player's shots, crosses and line-breaking passes.

Tables come from the dated S3 folder (settings.PFF_DERIVED_PREFIX), built by
`notebooks/build_app_volume_tables.py` with the card's definitions: open play only; attempts, not completions;
a line-breaking pass is one PFF marks as breaking at least one defensive line (linesBrokenType A, M, D or a combination).
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

LINES = {"A": "Attacking line", "M": "Midfield line", "D": "Defensive line"}
LINE_ORDER = ["Midfield line", "Attacking line", "Defensive line", "Two or more lines"]


@lru_cache(maxsize=1)
def load_attempts() -> pd.DataFrame:
    return pd.read_parquet(io.BytesIO(_read_bytes("volume_attempts.parquet")))


@lru_cache(maxsize=1)
def load_volume_players() -> pd.DataFrame:
    return pd.read_parquet(io.BytesIO(_read_bytes("volume_players.parquet")))


def _line_label(code):
    return LINES.get(code, "Two or more lines") if isinstance(code, str) else None


def player_volume(att: pd.DataFrame, players: pd.DataFrame, pid: int) -> dict:
    row = players[players.pff_player_id == pid]
    if row.empty:
        raise KeyError(pid)
    me = row.iloc[0]
    pool = players[(players.peers == me.peers) & players.in_pool].set_index("pff_player_id")
    A = att[att.pff_player_id.isin(pool.index)].copy()
    mine = A[A.pff_player_id == pid]

    # ---- line-breaking passes per 90 = passes per 90 x share of passes that break a line
    pas = A[A.action == "pass"].copy()
    pas["lb"] = pas.lines_broken.notna()
    g = pas.groupby("pff_player_id")
    T = pd.DataFrame({"passes": g.size(), "lb": g.lb.sum()}).reindex(pool.index).fillna(0).join(pool[["minutes"]])
    T["p90"], T["lb90"] = T.passes / T.minutes * 90, T.lb / T.minutes * 90
    T["share"] = T.lb / T.passes.where(T.passes > 0)
    if pid not in T.index:
        raise KeyError(pid)
    e = T.loc[pid]
    med_p90, med_share = float(T.p90.median()), float(T.share.median())
    passing = {
        "passes": int(e.passes), "lb": int(e.lb), "minutes": float(e.minutes), "p90": float(e.p90), "share": float(e.share), "lb90": float(e.lb90),
        "median_p90": med_p90, "median_share": med_share, "median_lb90": float(T.lb90.median()),
        "his_p90_on_median_share": float(e.p90 * med_share), "median_p90_on_his_share": float(med_p90 * e.share),
        "share_below": int((T.share < e.share).sum()), "pool_size": int(len(T)),
        "peers": [{"p90": round(float(a), 2), "share": round(float(b), 4), "me": bool(i == pid)} for i, a, b in zip(T.index, T.p90, T.share)],
    }

    # ---- completion of line-breaking passes: which line he breaks matters
    pas["ok"] = pas.success.astype(float)
    pas["line"] = pas.lines_broken.map(_line_label)
    lbp = pas[pas.lb]
    swap = _rate_split(lbp, "ok", "line", lbp.pff_player_id == pid)
    groups = sorted(swap["groups"], key=lambda g_: LINE_ORDER.index(g_["group"]) if g_["group"] in LINE_ORDER else 99)
    completion = {
        "groups": groups,
        "his_rate": swap["his_rate"], "peer_rate": swap["peer_rate"],
        "his_rates_peer_mix": swap["his_rates_peer_mix"], "peer_rates_his_mix": swap["peer_rates_his_mix"],
        "his_other_rate": float(pas[(pas.pff_player_id == pid) & ~pas.lb].ok.mean()), "peer_other_rate": float(pas[~pas.lb].ok.mean()),
    }

    # ---- shots and crosses
    shots = mine[mine.action == "shot"].sort_values("xg", ascending=False)
    crosses = mine[mine.action == "cross"]
    shots_all = A[A.action == "shot"]
    minutes = pool.minutes
    s90 = (shots_all.groupby("pff_player_id").size().reindex(pool.index).fillna(0) / minutes * 90)
    c90 = (A[A.action == "cross"].groupby("pff_player_id").size().reindex(pool.index).fillna(0) / minutes * 90)
    attempts = {
        "shots": int(len(shots)), "shots90": float(len(shots) / me.minutes * 90), "median_shots90": float(s90.median()),
        "xg_total": float(shots.xg.sum()), "xg_per_shot": None if shots.empty else float(shots.xg.mean()),
        "peer_xg_per_shot": float(shots_all.xg.mean()),
        "crosses": int(len(crosses)), "crosses90": float(len(crosses) / me.minutes * 90), "median_crosses90": float(c90.median()),
        "shot_list": _clean(shots[["match", "clock", "xg", "success", "goal"]].round(2)),
        "cross_list": _clean(crosses[["match", "clock", "success"]]),
    }
    points = _clean(mine[["action", "x_att", "y_att", "success", "lines_broken", "xg"]].round(2))

    return {
        "player": _clean(row[["pff_player_id", "peers", "matches", "minutes"]])[0],
        "pool_size": int(len(pool)), "passing": passing, "completion": completion, "attempts": attempts, "points": points,
    }


@router.get("/api/players/{pff_player_id}/volume", summary="What drives a player's action volume numbers")
async def volume_for_player(pff_player_id: int):
    try:
        att, players = load_attempts(), load_volume_players()
    except Exception as e:
        logger.exception("Failed to load volume data")
        raise HTTPException(500, f"Failed to load volume data: {e}")
    try:
        return player_volume(att, players, pff_player_id)
    except KeyError:
        raise HTTPException(404, f"No volume data for player {pff_player_id}")
