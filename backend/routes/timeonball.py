# routes/timeonball.py
"""
Players > Time on the ball: what drives the share of a player's moments that give him 2+ seconds.

Tables come from the dated S3 folder (settings.PFF_DERIVED_PREFIX), built by `notebooks/build_app_time_tables.py`.
Time on the ball at a moment = the smallest, over the opponents, of 0.7 s reaction (he keeps his velocity) plus a straight run
to the carrier at 5 m/s (build_pff_space.py, after Spearman 2018 / Friends of Tracking).
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

MIN_MOMENTS = 50            # the card ranks the row only for players with 50+ moments
BANDS = [0, 1, 1.5, 2, 3, 99]
BAND_LABELS = ["Under 1 s", "1 to 1.5 s", "1.5 to 2 s", "2 to 3 s", "3+ s"]
KIND = {"reception": "Receiving the ball", "action": "Releasing the ball"}


@lru_cache(maxsize=1)
def load_time_moments() -> pd.DataFrame:
    return pd.read_parquet(io.BytesIO(_read_bytes("time_moments.parquet")))


@lru_cache(maxsize=1)
def load_time_players() -> pd.DataFrame:
    return pd.read_parquet(io.BytesIO(_read_bytes("time_players.parquet")))


@lru_cache(maxsize=1)
def load_time_examples() -> list:
    return json.loads(_read_bytes("time_examples.json"))


def _share(series: pd.Series, keys) -> dict:
    s = series.value_counts(normalize=True)
    return {k: float(s.get(k, 0.0)) for k in keys}


def player_time(moments: pd.DataFrame, players: pd.DataFrame, examples: list, pid: int) -> dict:
    row = players[players.pff_player_id == pid]
    if row.empty:
        raise KeyError(pid)
    me = row.iloc[0]
    pool = players[(players.peers == me.peers) & players.in_pool]
    M = moments[moments.player_id.isin(set(pool.pff_player_id))].copy()
    mine = M[M.player_id == pid]
    if mine.empty:
        raise KeyError(pid)

    M["two"] = (M.time_on_ball >= 2).astype(float)
    M["kind_label"] = M.kind.map(KIND)
    M["band"] = pd.cut(M.time_on_ball, BANDS, labels=BAND_LABELS, right=False).astype(object)
    mine = M[M.player_id == pid]

    per = M.groupby("player_id").two.agg(["size", "mean"])
    per = per[per["size"] >= MIN_MOMENTS]
    summary = {
        "moments": int(len(mine)), "two": int(mine.two.sum()), "share": float(mine.two.mean()),
        "peer_share": float(M.two.mean()), "median_player_share": float(per["mean"].median()),
        "median_seconds": float(mine.time_on_ball.median()), "peer_median_seconds": float(M.time_on_ball.median()),
        "pool_size": int(len(per)),
    }
    bands = {"labels": BAND_LABELS, "player": _share(mine.band, BAND_LABELS), "peers": _share(M.band, BAND_LABELS)}

    tests, tables = {}, {}
    for name, col in (("kind", "kind_label"), ("zone", "zone")):
        sub = M.dropna(subset=[col])
        swap = _rate_split(sub, "two", col, sub.player_id == pid)
        tests[name] = {k: swap[k] for k in ("his_rate", "peer_rate", "his_rates_peer_mix", "peer_rates_his_mix")}
        tables[name] = swap["groups"]

    # is it his team? every player's moments by team, then his team's midfielders in the pool
    team = mine.team.mode().iat[0] if mine.team.notna().any() else None
    T = moments.dropna(subset=["team"]).assign(two=lambda d: (d.time_on_ball >= 2).astype(float)).groupby("team").two.agg(["size", "mean"])
    team_info = None
    if team in T.index:
        ranked = T["mean"].sort_values(ascending=False)
        mates = per.join(players.set_index("pff_player_id")[["name"]])
        tm_ids = set(moments[(moments.team == team) & moments.player_id.isin(per.index)].player_id)
        mates = mates[mates.index.isin(tm_ids)].sort_values("mean", ascending=False)
        team_info = {
            "team": team, "share": float(T.loc[team, "mean"]), "rank": int(list(ranked.index).index(team) + 1), "teams": int(len(T)),
            "median_team_share": float(T["mean"].median()),
            "midfielders": [{"name": n, "share": float(s), "moments": int(k), "me": bool(i == pid)} for i, (n, s, k) in
                            zip(mates.index, zip(mates.name, mates["mean"], mates["size"]))],
        }

    return {
        "player": _clean(row[["pff_player_id", "name", "peers", "matches", "minutes"]])[0],
        "summary": summary, "bands": bands, "tests": tests, "tables": tables, "team": team_info, "examples": examples,
    }


@router.get("/api/players/{pff_player_id}/time", summary="What drives a player's time on the ball")
async def time_for_player(pff_player_id: int):
    try:
        moments, players, examples = load_time_moments(), load_time_players(), load_time_examples()
    except Exception as e:
        logger.exception("Failed to load time data")
        raise HTTPException(500, f"Failed to load time data: {e}")
    try:
        return player_time(moments, players, examples, pff_player_id)
    except KeyError:
        raise HTTPException(404, f"No time-on-the-ball data for player {pff_player_id}")
