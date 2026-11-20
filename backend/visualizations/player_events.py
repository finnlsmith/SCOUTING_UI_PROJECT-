"""
Shared event rules used by the match stats, the phase stats and the player tables.

Pitch coordinates are StatsBomb's 120 x 80, with each team always attacking toward x = 120.
"""

import pandas as pd

from visualizations.helpers import to_point

# Opponent's penalty box and the final third
BOX_X_MIN, BOX_Y_MIN, BOX_Y_MAX = 102.0, 18.0, 62.0
FINAL_THIRD_X = 80.0
OWN_HALF_X = 60.0

# A "defensive error": a mistake the data records, made in the team's own half
DEFENSIVE_ERROR_TYPES = ("Error", "Miscontrol", "Dispossessed")

# On-ball events that show a team got into the opponent's box (used when no pass or carry did it)
BOX_GAIN_TYPES = (
    "Ball Receipt*", "Ball Recovery", "Interception", "Shot", "Dribble",
    "Carry", "Pass", "Miscontrol", "Dispossessed",
)


def in_box(x, y) -> bool:
    return x is not None and y is not None and BOX_X_MIN <= x <= 120 and BOX_Y_MIN <= y <= BOX_Y_MAX


def in_match_order(df: pd.DataFrame) -> pd.DataFrame:
    """Events sorted by when they happened (the files are grouped by event type, not by time)."""
    keys = [k for k in ("period", "index_num") if k in df.columns]
    if len(keys) < 2:
        keys = [k for k in ("period", "minute", "second") if k in df.columns]
    return df.sort_values(keys, kind="stable") if keys else df


def _xy(val):
    pt = to_point(val)
    return (pt[0], pt[1]) if pt else (None, None)


def _in_own_six_yard_box(x, y) -> bool:
    return x is not None and y is not None and x <= 6.0 and 30.0 <= y <= 50.0


def defensive_errors(events: pd.DataFrame, team: str) -> pd.DataFrame:
    """
    The team's errors, miscontrols and dispossessions in its own half, in match order.

    Left out: a goalkeeper's mistake inside their own six-yard box, and a goalkeeper "error" right
    after a shot or after the keeper's own save/punch (a parry that went wrong reads as a save, not a defensive error).
    """
    if events is None or events.empty or not {"type", "team", "location"} <= set(events.columns):
        return pd.DataFrame()
    ordered = in_match_order(events).reset_index(drop=True)
    is_shot = ordered["type"].isin(["Shot", "Goal Keeper"]).to_numpy()  # a shot, or the keeper's own save/punch
    mask = ((ordered["team"] == team) & ordered["type"].isin(DEFENSIVE_ERROR_TYPES)).to_numpy()
    rows = ordered[mask].copy()
    if rows.empty:
        return rows
    xy = rows["location"].apply(_xy)
    rows["px"] = [p[0] for p in xy]
    rows["py"] = [p[1] for p in xy]
    keep = []
    for pos, (_, r) in zip(ordered.index[mask], rows.iterrows()):
        x, y = r["px"], r["py"]
        if x is None or pd.isna(x) or x >= OWN_HALF_X:
            keep.append(False)
            continue
        is_keeper = str(r.get("position")) == "Goalkeeper"
        if is_keeper and _in_own_six_yard_box(x, y):
            keep.append(False)
            continue
        if is_keeper and r["type"] == "Error" and is_shot[max(pos - 3, 0):pos].any():
            keep.append(False)
            continue
        keep.append(True)
    return rows[keep]


def box_gain_entries(events: pd.DataFrame, team: str, counted_possessions) -> pd.DataFrame:
    """
    Times the team got the ball in the opponent's box WITHOUT a completed pass or a carry into it,
    for example after a defender's mistake. One row per possession (the first touch in the box),
    skipping possessions already counted as box entries.
    """
    needed = {"type", "team", "location", "possession"}
    if events is None or events.empty or not needed <= set(events.columns):
        return pd.DataFrame()
    rows = events[(events["team"] == team) & (events["type"].isin(BOX_GAIN_TYPES))].copy()
    if "possession_team" in rows.columns:
        rows = rows[rows["possession_team"] == team]
    if rows.empty:
        return rows
    xy = rows["location"].apply(_xy)
    rows["px"] = [p[0] for p in xy]
    rows["py"] = [p[1] for p in xy]
    rows = rows[[in_box(x, y) for x, y in zip(rows["px"], rows["py"])]]
    rows = rows[rows["possession"].notna()]
    if rows.empty:
        return rows
    rows = rows[~rows["possession"].astype(int).isin(set(int(p) for p in counted_possessions))]
    # earliest touch in the box for each possession
    return in_match_order(rows).drop_duplicates("possession", keep="first")
