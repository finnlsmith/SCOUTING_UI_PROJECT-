"""
Per-player tables shown under the shot map and the passing network.

Two tables for one team:
  * attack   - shots, xG, final third entries, box touches, goal-side receptions
  * creation - line-breaking passes, carries into the box, passes into the box,
               possession-ending actions, shot-creating actions

Definitions (all in StatsBomb 120 x 80 coordinates, team attacking toward x = 120):
  * Final third entry: a completed pass or a carry that starts before x = 80 and ends at x >= 80.
  * Box touch: a pass, shot, dribble, miscontrol or dispossession by the player inside the
    opponent's box (a reception is not counted on its own, so one touch is not counted twice).
  * Goal-side reception: a successful reception in the attacking 35% of the pitch (x >= 78) where,
    in the 360 freeze frame, the nearest opponent is BEHIND the receiver (the receiver is closer to
    goal) and at least 3 yards away, so the player received it in space rather than under pressure.
  * Line-breaking pass: a completed forward pass (5+ yards) that passes at least 3 opponents,
    judged from the 360 freeze frame: opponents between passer and receiver (in x) and within
    12 yards of the line of the pass.
  * Carry into the box / pass into the box: starts outside the box, ends inside it (passes must
    be completed).
  * Possession-ending action: dispossessed, miscontrol, shot, incomplete pass or cross, failed
    dribble, error, foul committed.
  * Shot-creating action: the completed pass, successful dribble or foul won directly before a
    shot, or the one before that, as long as each is within 10 seconds of the shot.
"""

import re
import traceback

import numpy as np
import pandas as pd
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder

from visualizations.helpers import to_point, format_player_name
from visualizations.player_events import in_box, in_match_order, FINAL_THIRD_X
from visualizations.event_context import apply_window

GOALSIDE_MIN_X = 78.0       # the attacking 35% of the pitch (65% of 120)
GOALSIDE_MIN_SPACE = 3.0    # nearest opponent must be at least this many yards away
LINE_BREAK_MIN_OPPONENTS = 3
LINE_BREAK_CORRIDOR = 12.0
LINE_BREAK_MIN_FORWARD = 5.0
SHOT_CREATION_WINDOW_SECONDS = 10.0

BOX_TOUCH_TYPES = ("Pass", "Shot", "Dribble", "Miscontrol", "Dispossessed")
ATTACK_COLUMNS = ("shots", "xg", "final_third_entries", "box_touches", "goalside_receptions")
CREATION_COLUMNS = ("line_breaking_passes", "carries_into_box", "passes_into_box",
                    "possession_ending", "shot_creating")


def _col(df: pd.DataFrame, name: str) -> pd.Series:
    return df[name] if name in df.columns else pd.Series([None] * len(df), index=df.index)


def _points(series: pd.Series):
    pts = [to_point(v) for v in series]
    xs = [p[0] if p else np.nan for p in pts]
    ys = [p[1] if p else np.nan for p in pts]
    return xs, ys


def _freeze_frames(frames: pd.DataFrame, ids) -> dict:
    """event id -> {'opp': array of (x, y) for outfield opponents, 'actor': (x, y) or None}."""
    if frames is None or frames.empty or not {"id", "teammate", "location"} <= set(frames.columns):
        return {}
    sub = frames[frames["id"].isin(set(ids))]
    out = {}
    for fid, grp in sub.groupby("id"):
        pts = [to_point(v) for v in grp["location"]]
        ok = np.array([p is not None for p in pts])
        xy = np.array([p if p is not None else (np.nan, np.nan) for p in pts], dtype=float).reshape(-1, 2)
        keeper = grp["keeper"].fillna(0).astype(bool).to_numpy() if "keeper" in grp.columns else np.zeros(len(grp), bool)
        mate = grp["teammate"].fillna(0).astype(bool).to_numpy()
        actor = grp["actor"].fillna(0).astype(bool).to_numpy() if "actor" in grp.columns else np.zeros(len(grp), bool)
        opp = xy[(~mate) & (~keeper) & ok]
        act = xy[actor & ok]
        out[fid] = {"opp": opp, "actor": tuple(act[0]) if len(act) else None}
    return out


def build_player_tables(events: pd.DataFrame, frames, team: str) -> dict:
    ev = in_match_order(events.copy())
    ev = ev[ev["team"].notna()]
    if "period" in ev.columns:
        ev = ev[ev["period"].fillna(0) < 5]  # leave the penalty shootout out
    te = ev[(ev["team"] == team) & ev["player"].notna()].copy()
    if te.empty:
        raise HTTPException(status_code=404, detail=f"No events for team '{team}'")

    te["sx"], te["sy"] = _points(_col(te, "location"))
    te["t"] = _col(te, "minute").fillna(0).astype(float) * 60 + _col(te, "second").fillna(0).astype(float)

    players = sorted(te["player"].astype(str).unique())
    attack = {p: {c: 0 for c in ATTACK_COLUMNS} for p in players}
    creation = {p: {c: 0 for c in CREATION_COLUMNS} for p in players}
    for p in players:
        attack[p]["xg"] = 0.0

    typ = te["type"]
    pass_ok = (typ == "Pass") & _col(te, "pass_outcome").isna()

    # ---- shots and xG ----
    for _, r in te[typ == "Shot"].iterrows():
        a = attack[str(r["player"])]
        a["shots"] += 1
        xg = pd.to_numeric(r.get("shot_statsbomb_xg"), errors="coerce")
        a["xg"] += float(xg) if pd.notna(xg) else 0.0

    # ---- final third entries (completed passes and carries) ----
    passes = te[pass_ok].copy()
    passes["ex"], passes["ey"] = _points(_col(passes, "pass_end_location"))
    carries = te[typ == "Carry"].copy()
    carries["ex"], carries["ey"] = _points(_col(carries, "carry_end_location"))
    for df, bucket in ((passes, "pass"), (carries, "carry")):
        for r in df.itertuples():
            if r.sx < FINAL_THIRD_X <= r.ex:
                attack[str(r.player)]["final_third_entries"] += 1

    # ---- box touches ----
    for r in te[typ.isin(BOX_TOUCH_TYPES)].itertuples():
        if in_box(r.sx, r.sy):
            attack[str(r.player)]["box_touches"] += 1

    # ---- 360-based: goal-side receptions and line-breaking passes ----
    recs = te[(typ == "Ball Receipt*") & _col(te, "ball_receipt_outcome").isna()]
    fwd = passes[(passes["ex"] - passes["sx"]) >= LINE_BREAK_MIN_FORWARD]
    needed = list(recs["id"].dropna()) + list(fwd["id"].dropna()) if "id" in te.columns else []
    frame_by_id = _freeze_frames(frames, needed)
    rec_with_frame = pass_with_frame = 0
    for r in recs.itertuples():
        fr = frame_by_id.get(getattr(r, "id", None))
        if fr is None or len(fr["opp"]) == 0 or np.isnan(r.sx):
            continue
        rec_with_frame += 1
        me = fr["actor"] if fr["actor"] is not None else (r.sx, r.sy)
        if me[0] < GOALSIDE_MIN_X:
            continue
        d = np.hypot(fr["opp"][:, 0] - me[0], fr["opp"][:, 1] - me[1])
        nearest = fr["opp"][int(np.argmin(d))]
        if me[0] > nearest[0] and float(d.min()) >= GOALSIDE_MIN_SPACE:
            attack[str(r.player)]["goalside_receptions"] += 1
    for r in fwd.itertuples():
        fr = frame_by_id.get(getattr(r, "id", None))
        if fr is None or len(fr["opp"]) == 0:
            continue
        pass_with_frame += 1
        ox, oy = fr["opp"][:, 0], fr["opp"][:, 1]
        line_y = r.sy + (ox - r.sx) * (r.ey - r.sy) / (r.ex - r.sx)
        beaten = (ox > r.sx) & (ox < r.ex) & (np.abs(oy - line_y) <= LINE_BREAK_CORRIDOR)
        if int(beaten.sum()) >= LINE_BREAK_MIN_OPPONENTS:
            creation[str(r.player)]["line_breaking_passes"] += 1

    # ---- carries and passes into the box ----
    for r in carries.itertuples():
        if not in_box(r.sx, r.sy) and in_box(r.ex, r.ey):
            creation[str(r.player)]["carries_into_box"] += 1
    for r in passes.itertuples():
        if not in_box(r.sx, r.sy) and in_box(r.ex, r.ey):
            creation[str(r.player)]["passes_into_box"] += 1

    # ---- possession-ending actions ----
    po_pass = (typ == "Pass") & _col(te, "pass_outcome").notna() & (_col(te, "pass_outcome") != "Injury Clearance")
    po_drib = (typ == "Dribble") & (_col(te, "dribble_outcome") == "Incomplete")
    po_other = typ.isin(["Dispossessed", "Miscontrol", "Shot", "Error", "Foul Committed"])
    for name in te.loc[po_pass | po_drib | po_other, "player"].astype(str):
        creation[name]["possession_ending"] += 1

    # ---- shot-creating actions: the two actions before each shot, each within 10 seconds ----
    eligible_dribble = (typ == "Dribble") & (_col(te, "dribble_outcome") == "Complete")
    eligible_pass = pass_ok | ((typ == "Pass") & _col(te, "pass_shot_assist").fillna(False).astype(bool))
    eligible = te[eligible_pass | eligible_dribble | (typ == "Foul Won")]
    key = "index_num" if "index_num" in te.columns else None
    for shot in te[typ == "Shot"].itertuples():
        pool = eligible[eligible["possession"] == shot.possession]
        if key:
            pool = pool[pool[key] < getattr(shot, key)]
        else:
            pool = pool[pool["t"] <= shot.t]
        for act in pool.iloc[::-1].head(2).itertuples():
            if shot.t - act.t <= SHOT_CREATION_WINDOW_SECONDS:
                creation[str(act.player)]["shot_creating"] += 1
            else:
                break

    def rows(table, columns):
        out = []
        for name in players:
            vals = table[name]
            if not any(vals[c] for c in columns):
                continue
            row = {"player": name, "short": format_player_name(name) or name}
            row.update({c: (round(vals[c], 2) if c == "xg" else int(vals[c])) for c in columns})
            out.append(row)
        out.sort(key=lambda r: tuple(-r[c] for c in columns))
        return out

    def pct(n, d):
        return round(100 * n / d) if d else None

    return {
        "team": team,
        "attack": rows(attack, ATTACK_COLUMNS),
        "creation": rows(creation, CREATION_COLUMNS),
        "coverage": {
            "receptions_with_360_pct": pct(rec_with_frame, len(recs)),
            "forward_passes_with_360_pct": pct(pass_with_frame, len(fwd)),
        },
    }


async def player_tables(filename: str, team: str, period=None, start=None, end=None):
    from cache import cache, s3

    cache_key = f"playertables:{filename}:{team}:{period}:{start}:{end}"
    cached = cache.get(cache_key, cache_type="passing_network")
    if cached is not None:
        return JSONResponse(content=jsonable_encoder(cached))
    try:
        events = s3.get_dataframe(filename, cache_type="events_df")
        if events is None:
            raise HTTPException(status_code=404, detail=f"S3 key not found: {filename}")
        for needed in ("type", "team", "player", "location"):
            if needed not in events.columns:
                raise HTTPException(status_code=400, detail=f"Missing column '{needed}'")
        m = re.search(r"\d+", filename or "")
        frames = None
        if m:
            try:
                frames = s3.get_dataframe(f"frames_360_{m.group()}.csv", cache_type="events_df")
            except Exception:
                frames = None  # 360 columns just stay at zero
        events = apply_window(events, period, start, end)  # a phase, or the whole match when no window
        payload = build_player_tables(events, frames, team)
        cache.set(cache_key, payload, cache_type="passing_network")
        return JSONResponse(content=jsonable_encoder(payload))
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"player_tables failed: {type(e).__name__}: {e}")
