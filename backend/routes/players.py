# routes/players.py
"""
Players section: PFF World Cup 2022 player profile elements.

Each element of the player card gets endpoints here that show (1) how it appears in the data and
(2) the numbers behind a player's card row. The first element is PACE: the share of a player's
on-ball actions made at 15+ km/h.

Data comes from small derived tables in a dated S3 folder (settings.PFF_DERIVED_PREFIX), built by
`notebooks/build_app_pace_tables.py` and `build_pff_actions.py` in the Playing at Speed project.
"""
import io
import json
import logging
import re
from functools import lru_cache

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException

from config.settings import PFF_DERIVED_PREFIX, S3_BUCKET, s3_client

router = APIRouter(tags=["Players"])
logger = logging.getLogger(__name__)

FAST_KMH = 15
# Edges (km/h) for the speed histogram: the last bin is open ended.
SPEED_BINS = [0, 5, 10, 15, 20, 25, 30, 50]


# ---------- loading (S3) ----------

def _read_bytes(key):
    return s3_client.get_object(Bucket=S3_BUCKET, Key=f"{PFF_DERIVED_PREFIX}/{key}")["Body"].read()


@lru_cache(maxsize=1)
def load_pace_players() -> pd.DataFrame:
    return pd.read_parquet(io.BytesIO(_read_bytes("pace_players.parquet")))


@lru_cache(maxsize=1)
def load_all_actions() -> pd.DataFrame:
    """Every on-ball action from all 64 matches, x / y flipped so the team attacks left to right."""
    return pd.read_parquet(io.BytesIO(_read_bytes("actions_attacking_right.parquet")))


@lru_cache(maxsize=32)
def load_card(slug: str) -> dict:
    """One player's full card (as built by the card generator): sections, rows, standard stats, great actions."""
    return json.loads(_read_bytes(f"cards/{slug}.json"))


@lru_cache(maxsize=1)
def load_demo():
    meta = json.loads(_read_bytes("demo_meta.json"))
    trace = pd.read_parquet(io.BytesIO(_read_bytes("demo_speed_trace.parquet")))
    actions = pd.read_parquet(io.BytesIO(_read_bytes("demo_actions.parquet")))
    return meta, trace, actions


# ---------- calculations (no S3, so they can be tested) ----------

def _clean(df: pd.DataFrame) -> list:
    """Records with NaN/inf turned into None so the JSON is valid."""
    df = df.replace([np.inf, -np.inf], np.nan)
    return json.loads(df.to_json(orient="records"))


def _by_action(usable: pd.DataFrame) -> pd.DataFrame:
    """Per action type: how many, how many at pace, share of all actions, share at pace."""
    g = (usable.assign(fast=usable.speed_kmh >= FAST_KMH)
         .groupby("action").agg(n=("fast", "size"), fast=("fast", "sum")))
    g["mix"] = g.n / g.n.sum() if len(g) else 0.0
    g["fast_share"] = g.fast / g.n
    return g


def player_pace(players: pd.DataFrame, actions: pd.DataFrame, pff_player_id: int) -> dict:
    """Everything the Pace section shows for one player."""
    row = players[players.pff_player_id == pff_player_id]
    if row.empty:
        raise KeyError(pff_player_id)
    me = row.iloc[0]

    mine = actions[actions.pff_player_id == pff_player_id]
    usable = mine[mine.usable.astype(bool)]
    counts, _ = np.histogram(usable.speed_kmh.dropna(), bins=SPEED_BINS)
    bins = [{"from": SPEED_BINS[i], "to": SPEED_BINS[i + 1], "count": int(c), "fast": SPEED_BINS[i] >= FAST_KMH}
            for i, c in enumerate(counts)]

    # Where he sits among peers: the shares of everyone ranked in the same group
    pool = players[(players.peers == me.peers) & players.in_pool & (players.act_n >= 50)]

    # What drives the number: the mix of actions, and the speed within each kind of action
    mine_by = _by_action(usable)
    peers_by = _by_action(actions[actions.pff_player_id.isin(pool.pff_player_id) & actions.usable.astype(bool)])
    kinds = sorted(set(mine_by.index) | set(peers_by.index), key=lambda k: -(peers_by.n.get(k, 0)))
    by_action = [{
        "action": k,
        "n": int(mine_by.n.get(k, 0)), "fast": int(mine_by.fast.get(k, 0)),
        "mix": float(mine_by["mix"].get(k, 0.0)),
        "fast_share": None if k not in mine_by.index else float(mine_by.fast_share[k]),
        "peer_n": int(peers_by.n.get(k, 0)), "peer_mix": float(peers_by["mix"].get(k, 0.0)),
        "peer_fast_share": None if k not in peers_by.index else float(peers_by.fast_share[k]),
    } for k in kinds]
    # Swap one ingredient at a time: his speeds on the peers' mix, and the peers' speeds on his mix
    his_speed_peer_mix = float(sum(peers_by["mix"][k] * mine_by.fast_share[k] for k in peers_by.index if k in mine_by.index))
    peer_speed_his_mix = float(sum(mine_by["mix"][k] * peers_by.fast_share[k] for k in mine_by.index if k in peers_by.index))

    by_match = (usable.assign(fast=usable.speed_kmh >= FAST_KMH).groupby(["match", "date"])
                .agg(n=("fast", "size"), fast=("fast", "sum")).reset_index().sort_values("date"))
    by_match["share"] = by_match.fast / by_match.n
    share = me.pace_share
    below = int((pool.pace_share < share).sum()) if pd.notna(share) else 0
    equal = int((pool.pace_share == share).sum()) if pd.notna(share) else 0
    return {
        "player": _clean(row[["pff_player_id", "name", "peers", "matches", "minutes", "act_n", "act_fast",
                              "pace_share", "percentile", "ranked"]])[0],
        "fast_kmh": FAST_KMH,
        "actions_total": int(len(mine)),
        "actions_usable": int(len(usable)),
        "actions_unknown_speed": int(len(mine) - len(usable)),
        "speed_bins": bins,
        "by_action": by_action,
        "mix_check": {"his_speed_peer_mix": his_speed_peer_mix, "peer_speed_his_mix": peer_speed_his_mix},
        "by_match": _clean(by_match),
        "peer_group": {
            "name": str(me.peers),
            "size": int(len(pool)),
            "below": below,
            "equal": equal,
            "median_share": None if pool.empty else float(pool.pace_share.median()),
            "shares": [round(float(v), 4) for v in pool.pace_share.sort_values()],
        },
        "actions": _clean(usable[["match", "date", "clock", "action", "success", "x", "y", "speed_kmh"]]),
    }


# ---------- routes ----------

@router.get("/api/players/pace/players", summary="Players with a pace figure")
async def pace_players(ranked_only: bool = False):
    """List players with their pace share (actions at 15+ km/h) and percentile among peers."""
    try:
        players = load_pace_players()
    except Exception as e:
        logger.exception("Failed to load pace_players")
        raise HTTPException(500, f"Failed to load player pace table: {e}")
    if ranked_only:
        players = players[players.ranked]
    players = players[players.act_n > 0].sort_values("name")
    return _clean(players[["pff_player_id", "name", "peers", "matches", "minutes", "act_n", "act_fast",
                           "pace_share", "percentile", "ranked"]])


@router.get("/api/players/pace/demo", summary="One player's speed through one match window")
async def pace_demo():
    """The 'in the data' example: a speed trace with each on-ball action marked on it."""
    try:
        meta, trace, actions = load_demo()
    except Exception as e:
        logger.exception("Failed to load pace demo")
        raise HTTPException(500, f"Failed to load pace demo: {e}")
    trace = trace.assign(t=trace.time_s - meta["window_start_s"])
    actions = actions.assign(t=actions.t - meta["window_start_s"])
    return {
        "meta": meta,
        "trace": _clean(trace[["t", "x", "y", "speed_kmh", "pff_speed"]].round(3)),
        "actions": _clean(actions.round(3)),
    }


@router.get("/api/players/{pff_player_id}/pace", summary="A player's pace profile")
async def pace_for_player(pff_player_id: int):
    """Pace share, percentile, speed histogram and every usable action with its speed."""
    try:
        players, actions = load_pace_players(), load_all_actions()
    except Exception as e:
        logger.exception("Failed to load pace data")
        raise HTTPException(500, f"Failed to load pace data: {e}")
    try:
        return player_pace(players, actions, pff_player_id)
    except KeyError:
        raise HTTPException(404, f"No player with id {pff_player_id}")


@router.get("/api/players/card/{slug}", summary="A player's card, exactly as the card generator builds it")
async def player_card(slug: str):
    """The Players homepage example card. `slug` is the lowercase underscore name, e.g. `enzo_fernandez`."""
    if not re.fullmatch(r"[a-z0-9_]+", slug):
        raise HTTPException(400, "Card name must be lowercase letters, digits and underscores")
    try:
        return load_card(slug)
    except s3_client.exceptions.NoSuchKey:
        raise HTTPException(404, f"No card named {slug}")
    except Exception as e:
        logger.exception("Failed to load card")
        raise HTTPException(500, f"Failed to load card: {e}")
