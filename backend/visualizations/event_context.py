"""
Shared "what happened around this event" rules, used by BOTH the whole-match view and the phases.

  * apply_window     - cut the events down to a time window (a phase, or the 60s before a shot)
  * event_context    - the actions immediately before one event (a shot, an error), ready to draw
  * error_follow_up  - did the opposition shoot (or score) shortly after a mistake?
  * player_touches   - where one player touched the ball in a window

Coordinates are StatsBomb 120 x 80, each team attacking toward x = 120. A sequence is returned in
the frame of the team that owns the selected event, so the other team's actions are mirrored.
"""

import pandas as pd

from visualizations.helpers import to_point, format_player_name
from visualizations.player_events import in_match_order, FINAL_THIRD_X

LOOKBACK_SECONDS = 15.0     # how far back "immediately before" reaches
MAX_ACTIONS = 8             # and at most this many actions
NETWORK_SECONDS = 60.0      # window for the temporary passing network after clicking a shot
FOLLOW_UP_SECONDS = 30.0    # an opposition shot this soon after a mistake is linked to it

# On-ball events worth drawing when showing how a chance came about
SEQUENCE_TYPES = (
    "Pass", "Carry", "Dribble", "Ball Recovery", "Interception", "Clearance",
    "Error", "Dispossessed", "Miscontrol", "Foul Won", "Shot",
)


def seconds_of(df: pd.DataFrame) -> pd.Series:
    """Match clock in seconds. The minute keeps counting through the second half."""
    return df["minute"].fillna(0).astype(float) * 60 + df["second"].fillna(0).astype(float)


def apply_window(events: pd.DataFrame, period=None, start=None, end=None) -> pd.DataFrame:
    """Events of one period with start < clock <= end (either bound may be left out)."""
    df = events
    if period is not None and "period" in df.columns:
        df = df[df["period"] == period]
    if start is not None or end is not None:
        t = seconds_of(df)
        if start is not None:
            df = df[t > start]
            t = seconds_of(df)
        if end is not None:
            df = df[t <= end]
    return df


def _pt(val):
    pt = to_point(val)
    return (pt[0], pt[1]) if pt else (None, None)


def flag(v) -> bool:
    """True for a switched-on flag. The data stores flags as 1.0 (or NaN when off), not as True/False."""
    if v is None:
        return False
    try:
        if pd.isna(v):
            return False
    except (TypeError, ValueError):
        pass
    if isinstance(v, str):
        return v.strip().lower() in ("true", "1", "1.0", "yes")
    return bool(v)


def pass_label(row) -> str:
    """Short description of the kind of pass: through ball, cross, cut-back, set piece..."""
    def on(name):
        return flag(row.get(name))

    if on("pass_through_ball"):
        return "Through ball"
    if on("pass_cut_back"):
        return "Cut-back"
    if on("pass_cross"):
        return "Cross"
    if on("pass_switch"):
        return "Switch of play"
    ptype = row.get("pass_type")
    if isinstance(ptype, str) and ptype and ptype != "Recovery":
        return ptype  # Corner, Free Kick, Throw-in, Goal Kick, Kick Off
    if str(row.get("pass_body_part")) == "Head":
        return "Header"
    height = row.get("pass_height")
    if isinstance(height, str) and height:
        return height  # Ground Pass / Low Pass / High Pass
    return "Pass"


def _action(row, owner_team) -> dict:
    """One drawable action, in the frame of `owner_team` (the other team is mirrored)."""
    typ = row["type"]
    sx, sy = _pt(row.get("location"))
    ex, ey = sx, sy
    label = typ
    outcome = None
    if typ == "Pass":
        ex, ey = _pt(row.get("pass_end_location"))
        label = pass_label(row)
        outcome = row.get("pass_outcome") if isinstance(row.get("pass_outcome"), str) else "Complete"
    elif typ == "Carry":
        ex, ey = _pt(row.get("carry_end_location"))
        label = "Carry"
    elif typ == "Dribble":
        outcome = row.get("dribble_outcome") if isinstance(row.get("dribble_outcome"), str) else None
        label = "Take-on"
    elif typ == "Shot":
        outcome = row.get("shot_outcome") if isinstance(row.get("shot_outcome"), str) else None

    mirrored = row.get("team") != owner_team
    if mirrored:  # other team's coordinates are in their own attacking frame
        sx, sy, ex, ey = [None if v is None else v for v in (sx, sy, ex, ey)]
        sx = None if sx is None else 120 - sx
        sy = None if sy is None else 80 - sy
        ex = None if ex is None else 120 - ex
        ey = None if ey is None else 80 - ey

    return {
        "kind": typ,
        "label": label,
        "outcome": outcome,
        "team": row.get("team"),
        "own_team": not mirrored,
        "player": str(row.get("player") or ""),
        "short": format_player_name(row.get("player")) or "",
        "minute": int(row["minute"]) if pd.notna(row.get("minute")) else None,
        "second": int(row["second"]) if pd.notna(row.get("second")) else None,
        "x1": sx, "y1": sy, "x2": ex, "y2": ey,
    }


def event_context(events: pd.DataFrame, event_id: str,
                  lookback: float = LOOKBACK_SECONDS, max_actions: int = MAX_ACTIONS) -> dict:
    """
    The actions immediately before the event with this id, plus the window for a 60s passing network.
    Includes the opposition's last actions (for example a clearance or error that gave the ball away).
    """
    ev = in_match_order(events)
    hit = ev[ev["id"] == event_id]
    if hit.empty:
        return {}
    row = hit.iloc[0]
    owner = row["team"]
    t0 = float(row["minute"]) * 60 + float(row["second"])

    same_period = ev[ev["period"] == row["period"]] if "period" in ev.columns else ev
    before = same_period[(same_period["index_num"] < row["index_num"])] if "index_num" in ev.columns else same_period
    before = before[before["type"].isin(SEQUENCE_TYPES)]
    t = seconds_of(before)
    before = before[(t0 - t) <= lookback].tail(max_actions)

    sx, sy = _pt(row.get("location"))
    xg = pd.to_numeric(row.get("shot_statsbomb_xg"), errors="coerce")
    return {
        "event": {
            "id": event_id, "type": row["type"], "team": owner,
            "player": str(row.get("player") or ""),
            "minute": int(row["minute"]), "second": int(row["second"]),
            "x": sx, "y": sy,
            "xg": round(float(xg), 3) if pd.notna(xg) else None,
            "outcome": row.get("shot_outcome") if isinstance(row.get("shot_outcome"), str) else None,
            "period": int(row["period"]) if pd.notna(row.get("period")) else None,
        },
        "sequence": [_action(r, owner) for _, r in before.iterrows()],
        "network_window": {
            "period": int(row["period"]) if pd.notna(row.get("period")) else None,
            "start": max(t0 - NETWORK_SECONDS, 0.0),
            "end": t0,
        },
    }


def error_follow_up(events: pd.DataFrame, error_row, seconds: float = FOLLOW_UP_SECONDS) -> dict:
    """
    Did the opposition shoot within `seconds` of this mistake? Returns {} if not, otherwise the
    shot's details, the delay, and whether it was a goal.
    """
    needed = {"type", "team", "minute", "second"}
    if not needed <= set(events.columns):
        return {}
    t0 = float(error_row["minute"]) * 60 + float(error_row["second"])
    opp = events[(events["type"] == "Shot") & (events["team"] != error_row["team"])]
    if "period" in events.columns and pd.notna(error_row.get("period")):
        opp = opp[opp["period"] == error_row["period"]]
    if opp.empty:
        return {}
    delay = seconds_of(opp) - t0
    opp = opp[(delay >= 0) & (delay <= seconds)]
    if opp.empty:
        return {}
    shot = in_match_order(opp).iloc[0]
    xg = pd.to_numeric(shot.get("shot_statsbomb_xg"), errors="coerce")
    outcome = shot.get("shot_outcome") if isinstance(shot.get("shot_outcome"), str) else ""
    return {
        "shot_id": shot.get("id"),
        "shot_player": str(shot.get("player") or ""),
        "shot_team": shot.get("team"),
        "delay": int(round(float(shot["minute"]) * 60 + float(shot["second"]) - t0)),
        "xg": round(float(xg), 3) if pd.notna(xg) else None,
        "outcome": outcome,
        "goal": outcome == "Goal",
    }


def player_touches(events: pd.DataFrame, team: str, player: str, mode: str = "touches") -> dict:
    """
    Where one player had the ball. mode = "touches" (every on-ball action) or
    "final_third_receptions" (balls received at x >= 80). Locations are in the player's own frame.
    """
    te = events[(events["team"] == team) & (events["player"] == player)].copy()
    if te.empty:
        return {"player": player, "team": team, "mode": mode, "points": []}
    if mode == "final_third_receptions":
        te = te[te["type"] == "Ball Receipt*"]
        if "ball_receipt_outcome" in te.columns:
            te = te[te["ball_receipt_outcome"].isna()]
    else:
        te = te[te["type"].isin(["Pass", "Shot", "Dribble", "Carry", "Ball Receipt*", "Ball Recovery",
                                 "Interception", "Clearance", "Miscontrol", "Dispossessed", "Duel", "Block"])]
    points = []
    for _, r in in_match_order(te).iterrows():
        x, y = _pt(r.get("location"))
        if x is None:
            continue
        if mode == "final_third_receptions" and x < FINAL_THIRD_X:
            continue
        points.append({
            "x": x, "y": y, "type": r["type"],
            "minute": int(r["minute"]) if pd.notna(r.get("minute")) else None,
            "second": int(r["second"]) if pd.notna(r.get("second")) else None,
        })
    return {"player": player, "team": team, "mode": mode, "count": len(points), "points": points}
