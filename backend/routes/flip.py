# routes/flip.py
"""
Players > Flip side and recoveries: what drives a player's four rows.

Tables come from the dated S3 folder (settings.PFF_DERIVED_PREFIX), built by `notebooks/build_app_flip_tables.py`
with flip_lib.py (notebook 15). Duels are PFF challenge types dribble, tackle and ball-carrier challenge with a recorded
winner; a fast carrier is 15+ km/h; the expected-win model gives each duel a win probability from carrier speed,
challenge type, where it happened and the defender's role.
"""
import io
import logging
from functools import lru_cache

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException

from routes.players import _clean, _read_bytes

router = APIRouter(tags=["Players"])
logger = logging.getLogger(__name__)

THIRDS = [-60, -17.5, 17.5, 60]
THIRD_LABELS = ["Own third", "Middle", "Final third"]
SPEED_BINS = [-1, 7, 15, 20, 99]
SPEED_LABELS = ["Under 7", "7 to 15", "15 to 20", "20+"]
CHALLENGE = {"D": "Dribble", "T": "Tackle", "B": "Carrier challenge"}


@lru_cache(maxsize=1)
def load_flip_duels() -> pd.DataFrame:
    return pd.read_parquet(io.BytesIO(_read_bytes("flip_duels.parquet")))


@lru_cache(maxsize=1)
def load_flip_recoveries() -> pd.DataFrame:
    return pd.read_parquet(io.BytesIO(_read_bytes("flip_recoveries.parquet")))


@lru_cache(maxsize=1)
def load_flip_players() -> pd.DataFrame:
    return pd.read_parquet(io.BytesIO(_read_bytes("flip_players.parquet")))


def _share(series: pd.Series, keys) -> dict:
    s = series.value_counts(normalize=True)
    return {k: float(s.get(k, 0.0)) for k in keys}


def player_flip(duels: pd.DataFrame, recs: pd.DataFrame, players: pd.DataFrame, pid: int) -> dict:
    row = players[players.pff_player_id == pid]
    if row.empty:
        raise KeyError(pid)
    me = row.iloc[0]
    pool = players[(players.peers == me.peers) & players.in_pool]
    ids = set(pool.pff_player_id)

    # ---- recoveries per 90 = opponent touches per 90 while he was on x recoveries per opponent touch
    opp90 = pool.opp_touches_on / pool.minutes_flip * 90
    my_opp90 = me.opp_touches_on / me.minutes_flip * 90
    med_opp90, med_rate = float(opp90.median()), float(pool.rec_per100_opp_touches.median())
    recoveries = {
        "n": int(me.n_rec), "per90": float(me.rec_per90), "median_per90": float(pool.rec_per90.median()),
        "opp90": float(my_opp90), "median_opp90": med_opp90,
        "per100": float(me.rec_per100_opp_touches), "median_per100": med_rate,
        "his_rate_on_median_opps": float(me.rec_per100_opp_touches / 100 * med_opp90),
        "median_rate_on_his_opps": float(med_rate / 100 * my_opp90),
        "minutes": float(me.minutes_flip),
        "peers": [{"opp90": round(float(a), 1), "rec90": round(float(b), 2), "me": bool(i == pid)}
                  for i, a, b in zip(pool.pff_player_id, opp90, pool.rec_per90)],
    }

    mine_r = recs[recs.pff_player_id == pid].copy()
    peers_r = recs[recs.pff_player_id.isin(ids)].copy()
    for d in (mine_r, peers_r):
        d["third"] = pd.cut(d.x_att, THIRDS, labels=THIRD_LABELS).astype(object)
    thirds = {"labels": THIRD_LABELS, "player": _share(mine_r.third, THIRD_LABELS), "peers": _share(peers_r.third, THIRD_LABELS),
              "player_n": {k: int((mine_r.third == k).sum()) for k in THIRD_LABELS}}
    my_final_share, peer_final_share = thirds["player"]["Final third"], thirds["peers"]["Final third"]
    final = {
        "per90": float(me.rec_final_third_per90), "median_per90": float(pool.rec_final_third_per90.median()),
        "n": int(me.n_rec_final), "share": float(my_final_share), "peer_share": float(peer_final_share),
        "his_recs_peer_share": float(me.rec_per90 * peer_final_share),
        "median_recs_his_share": float(recoveries["median_per90"] * my_final_share),
    }
    kinds = ["interception", "pass", "touch", "clearance", "shot"]
    sources = {"keys": kinds, "player": _share(mine_r.source, kinds), "peers": _share(peers_r.source, kinds)}
    picture = _clean(mine_r[["x_att", "y_att", "source", "match"]].round(1))

    # ---- duels
    h = duels[duels.defender.isin(ids)].copy()
    h["challenge"] = h["sub"].map(CHALLENGE)
    h["band"] = pd.cut(h.att_spd, SPEED_BINS, labels=SPEED_LABELS).astype(object)
    mine_d = h[h.defender == pid]
    n, wins = len(mine_d), int(mine_d.defender_won.sum())
    expected = float(mine_d.p_exp.sum())
    fast, fast_me = h[h.fast], mine_d[mine_d.fast]
    slow = h[~h.fast]
    duel = {
        "n": int(n), "wins": wins, "expected_wins": expected, "above_expected": wins - expected,
        "peer_rate": float(h.defender_won.mean()),
        "fast_n": int(len(fast_me)), "fast_wins": int(fast_me.defender_won.sum()), "fast_expected": float(fast_me.p_exp.sum()),
        "peer_fast_rate": float(fast.defender_won.mean()), "peer_slower_rate": float(slow.defender_won.mean()),
        "slower_rate": None if mine_d[~mine_d.fast].empty else float(mine_d[~mine_d.fast].defender_won.mean()),
        "fast_share": float(mine_d.fast.mean()) if n else None, "peer_fast_share": float(h.fast.mean()),
    }
    by_challenge = []
    for code, label in CHALLENGE.items():
        a, b = mine_d[mine_d["sub"] == code], h[h["sub"] == code]
        by_challenge.append({"challenge": label, "n": int(len(a)), "mix": float(len(a) / n) if n else 0.0,
                             "rate": None if a.empty else float(a.defender_won.mean()),
                             "peer_mix": float(len(b) / len(h)), "peer_rate": float(b.defender_won.mean())})
    by_speed = []
    for label in SPEED_LABELS:
        a, b = mine_d[mine_d.band == label], h[h.band == label]
        by_speed.append({"band": label, "n": int(len(a)), "rate": None if a.empty else float(a.defender_won.mean()),
                         "peer_n": int(len(b)), "peer_rate": None if b.empty else float(b.defender_won.mean())})
    fast_list = _clean(fast_me.sort_values("att_spd", ascending=False)[
        ["attacker_name", "challenge", "att_spd", "defender_won", "p_exp", "match"]].round(2))

    return {
        "player": _clean(row[["pff_player_id", "peers", "matches", "minutes"]])[0],
        "pool_size": int(len(pool)), "recoveries": recoveries, "thirds": thirds, "final": final, "sources": sources,
        "recovery_points": picture, "duel": duel, "by_challenge": by_challenge, "by_speed": by_speed, "fast_duels": fast_list,
    }


@router.get("/api/players/{pff_player_id}/flip", summary="What drives a player's flip side and recovery numbers")
async def flip_for_player(pff_player_id: int):
    try:
        duels, recs, players = load_flip_duels(), load_flip_recoveries(), load_flip_players()
    except Exception as e:
        logger.exception("Failed to load flip data")
        raise HTTPException(500, f"Failed to load flip data: {e}")
    try:
        return player_flip(duels, recs, players, pff_player_id)
    except KeyError:
        raise HTTPException(404, f"No flip data for player {pff_player_id}")
