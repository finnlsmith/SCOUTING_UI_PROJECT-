# routes/technique.py
"""
Players > Tempo and technique: the five card rows
    Played first time (tempo), First touch kept, First-time pass completion,
    Pass completion, Pass completion at 15+ km/h.

Tables come from the dated S3 folder (settings.PFF_DERIVED_PREFIX), built by
`notebooks/build_app_technique_tables.py` in the Playing at Speed project with the card generator's own
rules, so values and percentiles equal the card's.
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

Z90 = 1.645  # the card's 90% range
FAST_KMH = 15

# key -> label on the card, minimum events to be ranked, matches before the row is "settled"
ROWS = [
    {"key": "one_touch", "label": "Played first time (tempo)", "min_events": 50, "need": 4},
    {"key": "kept", "label": "First touch kept", "min_events": 50, "need": 11},
    {"key": "ft_pass", "label": "First-time pass completion", "min_events": 15, "need": 10},
    {"key": "pass", "label": "Pass completion", "min_events": 50, "need": 5},
    {"key": "pass_fast", "label": "Pass completion at 15+ km/h", "min_events": 15, "need": 20},
]


# ---------- loading ----------

def _parquet(name):
    return pd.read_parquet(io.BytesIO(_read_bytes(name)))


@lru_cache(maxsize=1)
def load_technique_players() -> pd.DataFrame:
    return _parquet("technique_players.parquet")


@lru_cache(maxsize=1)
def load_receptions() -> pd.DataFrame:
    return _parquet("receptions_slim.parquet")


@lru_cache(maxsize=1)
def load_passes() -> pd.DataFrame:
    return _parquet("passes_slim.parquet")


# ---------- calculations ----------

def wilson(k, n, z=Z90):
    """Wilson interval, as the card's 90% range."""
    if n <= 0:
        return None
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * np.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return [max(0.0, float(c - h)), min(1.0, float(c + h))]


def _pool(players: pd.DataFrame, me: pd.Series, key: str, min_events: int) -> pd.DataFrame:
    """The peers the card ranks him against for this row."""
    return players[(players.peers == me.peers) & players.in_pool & (players[f"{key}_n"] >= min_events)]


def _rate_split(df: pd.DataFrame, flag: str, group_col: str, player_mask: pd.Series) -> dict:
    """Rate of `flag` in each group for the player and his peers, and the two 'swap one ingredient' numbers."""
    def tab(d):
        g = d.groupby(group_col)[flag].agg(["size", "sum"])
        g["rate"] = g["sum"] / g["size"]
        g["mix"] = g["size"] / g["size"].sum()
        return g
    mine, peers = tab(df[player_mask]), tab(df)
    groups = [g for g in peers.index]
    rows = [{"group": g,
             "n": int(mine["size"].get(g, 0)), "k": int(mine["sum"].get(g, 0)),
             "mix": float(mine["mix"].get(g, 0.0)), "rate": None if g not in mine.index else float(mine.rate[g]),
             "peer_n": int(peers["size"][g]), "peer_mix": float(peers["mix"][g]), "peer_rate": float(peers.rate[g])}
            for g in groups]
    his_on_peer_mix = float(sum(peers["mix"][g] * mine.rate[g] for g in groups if g in mine.index))
    peer_on_his_mix = float(sum(mine["mix"][g] * peers.rate[g] for g in groups if g in mine.index))
    return {"groups": rows, "his_rates_peer_mix": his_on_peer_mix, "peer_rates_his_mix": peer_on_his_mix,
            "his_rate": float(df[player_mask][flag].mean()), "peer_rate": float(df[flag].mean())}


def player_technique(players: pd.DataFrame, receptions: pd.DataFrame, passes: pd.DataFrame, pid: int) -> dict:
    row = players[players.pff_player_id == pid]
    if row.empty:
        raise KeyError(pid)
    me = row.iloc[0]

    rows = []
    for spec in ROWS:
        key, minn = spec["key"], spec["min_events"]
        pool = _pool(players, me, key, minn)
        n, k, v = me[f"{key}_n"], me[f"{key}_k"], me[f"{key}_value"]
        ranked_pct = me[f"{key}_pct"]
        rows.append({
            **spec,
            "k": int(k), "n": int(n),
            "value": None if pd.isna(v) else float(v),
            "range": wilson(k, n) if n >= minn and n > 0 else None,
            "percentile": None if pd.isna(ranked_pct) else int(ranked_pct),
            "below": None if pd.isna(me[f"{key}_below"]) else int(me[f"{key}_below"]),
            "equal": None if pd.isna(me[f"{key}_equal"]) else int(me[f"{key}_equal"]),
            "pool_size": int(len(pool)),
            "peer_median": None if pool.empty else float(pool[f"{key}_value"].median()),
            "peer_shares": [round(float(x), 4) for x in pool[f"{key}_value"].sort_values()],
            "settled": bool(pd.notna(ranked_pct) and me.matches >= spec["need"]),
        })

    # peers for the breakdowns = the pool used for the reception rows
    pool_ids = set(_pool(players, me, "one_touch", 50).pff_player_id)
    rec = receptions[receptions.receiver_id.isin(pool_ids)].copy()
    rec["pressure_group"] = rec.pressure.map(lambda p: "No pressure" if p == "N" else ("Pressured" if isinstance(p, str) else None))
    rec_p = rec.dropna(subset=["pressure_group"])
    mine_rec = rec_p.receiver_id == pid
    first_time = _rate_split(rec_p.assign(f=rec_p.one_touch.astype(float)), "f", "pressure_group", mine_rec)

    my_rec = rec[rec.receiver_id == pid]
    failed_how = rec[rec.failed_reception].failed_how.value_counts()
    failed = {
        "his_failed": int(my_rec.failed_reception.sum()), "his_n": int(len(my_rec)),
        "peer_failed": int(rec.failed_reception.sum()), "peer_n": int(len(rec)),
        "peer_rate": float(rec.failed_reception.mean()),
        "expected_at_peer_rate": float(len(my_rec) * rec.failed_reception.mean()),
        "kinds": [{"how": str(h), "n": int(c)} for h, c in failed_how.items()],
    }

    pas = passes[passes.pff_player_id.isin(set(_pool(players, me, "pass", 50).pff_player_id))].copy()
    pas["f"] = pas.success.astype(float)
    pas["speed_group"] = np.where(pas.speed_kmh >= FAST_KMH, "15+ km/h", "Under 15 km/h")
    pas["pressure_group"] = pas.pressure.map(lambda p: "No pressure" if p == "N" else ("Pressured" if isinstance(p, str) else None))
    mine_pas = pas.pff_player_id == pid
    by_speed = _rate_split(pas, "f", "speed_group", mine_pas)
    by_pressure = _rate_split(pas.dropna(subset=["pressure_group"]), "f", "pressure_group", mine_pas[pas.pressure_group.notna()])

    # a few of his real receptions, from the match where he had most
    if my_rec.empty:
        examples, example_match = [], None
    else:
        example_match = my_rec.match.value_counts().index[0]
        ex = my_rec[my_rec.match == example_match].copy()
        ex["_t"] = ex.period * 10000 + ex.clock.map(lambda c: int(c.split(":")[0]) * 60 + int(c.split(":")[1]))
        ex = ex.sort_values("_t").head(8)
        examples = _clean(ex[["clock", "passer", "pressure", "touches", "failed_how", "next_action", "next_pass_complete"]])

    return {
        "player": _clean(row[["pff_player_id", "name", "peers", "matches", "minutes"]])[0],
        "peer_group": str(me.peers),
        "rows": rows,
        "first_time_by_pressure": first_time,
        "failed": failed,
        "pass_by_speed": by_speed,
        "pass_by_pressure": by_pressure,
        "examples": examples,
        "example_match": example_match,
    }


# ---------- routes ----------

@router.get("/api/players/technique/players", summary="Players with tempo and technique figures")
async def technique_players(ranked_only: bool = True):
    """Each player's five technique values and percentiles, for the chapter's player picker."""
    try:
        players = load_technique_players()
    except Exception as e:
        logger.exception("Failed to load technique table")
        raise HTTPException(500, f"Failed to load technique table: {e}")
    players = players[players.peers.notna()]
    if ranked_only:
        players = players[players.in_pool & (players.matches >= 4)]
    cols = ["pff_player_id", "name", "peers", "matches"]
    for spec in ROWS:
        cols += [f"{spec['key']}_value", f"{spec['key']}_pct", f"{spec['key']}_n"]
    return _clean(players.sort_values("name")[cols])


@router.get("/api/players/{pff_player_id}/technique", summary="A player's tempo and technique profile")
async def technique_for_player(pff_player_id: int):
    try:
        players, rec, pas = load_technique_players(), load_receptions(), load_passes()
    except Exception as e:
        logger.exception("Failed to load technique data")
        raise HTTPException(500, f"Failed to load technique data: {e}")
    try:
        return player_technique(players, rec, pas, pff_player_id)
    except KeyError:
        raise HTTPException(404, f"No player with id {pff_player_id}")
