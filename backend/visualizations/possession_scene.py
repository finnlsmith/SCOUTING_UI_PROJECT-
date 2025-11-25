"""
Possession scene visualization module.

Generates comprehensive possession sequence visualizations with player tracking,
movement trails, and event markers using matplotlib. This is the most complex
visualization module with detailed pitch drawings and event annotations.

NOTE: This is a large function extracted from routes/visualizations.py (lines 1680-2484).
The full implementation is preserved from the original file.
"""

import ast
import json
import io
import base64
import math
import traceback
import numpy as np
import pandas as pd
from fastapi import HTTPException

# Matplotlib imports
import matplotlib.pyplot as plt
from matplotlib.patches import Arc, Rectangle
import matplotlib.patches as patches
import matplotlib.gridspec as gridspec
import matplotlib.lines as mlines
import matplotlib.patches as mpatches

from visualizations.helpers import (
    get_xy, flip_y, flip_x, format_player_name, get_player
)


def draw_pitch(ax=None, color='black', lw=2):
    """Draw a StatsBomb 120x80 pitch on the given axis."""
    if ax is None:
        fig, ax = plt.subplots(figsize=(12, 8))
    ax.add_patch(Rectangle((0, 0), 120, 80, fill=False, edgecolor=color, lw=lw))
    ax.plot([60, 60], [0, 80], color=color, lw=lw)
    ax.add_patch(Rectangle((0, 18), 18, 44, fill=False, edgecolor=color, lw=lw))
    ax.add_patch(Rectangle((102, 18), 18, 44, fill=False, edgecolor=color, lw=lw))
    ax.add_patch(Rectangle((0, 30), 6, 20, fill=False, edgecolor=color, lw=lw))
    ax.add_patch(Rectangle((114, 30), 6, 20, fill=False, edgecolor=color, lw=lw))
    cc = plt.Circle((60, 40), 10, color=color, fill=False, lw=lw)
    ax.add_patch(cc)
    ax.plot(12, 80-40, marker='o', color=color)
    ax.plot(108, 80-40, marker='o', color=color)
    ax.set_xlim(-5, 125)
    ax.set_ylim(-5, 85)
    ax.set_xticks([]); ax.set_yticks([]); ax.set_aspect('equal')
    return ax


def team_is_shot_team(row, shot_team):
    """Check if event row belongs to shot team."""
    return (row.get('team', None) == shot_team)


def plot_squiggly(ax, x1, y1, x2, y2, color='gray', lw=1, zorder=3):
    """Plot a squiggly line (for dribbles and deflected passes)."""
    t = np.linspace(0, 1, 100)
    dx = x2 - x1
    dy = y2 - y1
    length = np.sqrt(dx * dx + dy * dy)
    if length < 1e-2:
        return
    ortho_x = -dy / length
    ortho_y = dx / length
    A = min(0.8, 0.06 * length)
    freq = 8
    squiggle = A * np.sin(2 * np.pi * freq * t)
    x = x1 + dx * t + squiggle * ortho_x
    y = y1 + dy * t + squiggle * ortho_y
    ax.plot(x, y, color=color, linewidth=lw, alpha=0.75, zorder=zorder)


async def possession_scene(filename: str, possession: int):
    """
    Generate a comprehensive possession sequence visualization.
    
    Creates a detailed static image showing player positions, movement trails, and
    event locations for a specific possession sequence using StatsBomb data and
    matplotlib for rendering.
    
    Args:
        filename: S3 key of the match events file
        possession: Possession sequence number to visualize
        
    Returns:
        dict: {"image_base64": <base64-encoded PNG image>}
        
    Raises:
        HTTPException: Various errors for missing data or processing failures
    """
    try:
        from cache import s3
        
        # Use async S3 client with caching
        events = s3.get_dataframe(filename, cache_type="events_df")
        if events is None:
            raise HTTPException(status_code=404, detail=f"Failed to load events file: {filename}")
        
        # --- Extract the single possession's events ---
        possession_df = events[events["possession"] == possession].copy()
        if possession_df.shape[0] < 1:
            return {"error": f"No events found for possession {possession}"}
        
        cols_first = ["type", "minute", "timestamp", "second", "location", "play_pattern", "player", "position", "shot_statsbomb_xg",
            "possession", "possession_team", "pass_angle", "pass_end_location", "pass_height", "pass_length",
            "pass_recipient", "pass_technique", "team", "period"]
        
        def reorder_cols(df, cols_first):
            all_cols = df.columns.tolist()
            first = [c for c in cols_first if c in all_cols]
            rest = [c for c in all_cols if c not in first]
            return df[first + rest]
        
        reordered_df = reorder_cols(possession_df, cols_first).copy()
        reordered_df["source_possession"] = possession
        if "timestamp" in reordered_df.columns:
            reordered_df = reordered_df.sort_values("timestamp")
        elif "minute" in reordered_df.columns and "second" in reordered_df.columns:
            reordered_df = reordered_df.sort_values(["minute", "second"])
        
        # SHOT FILTER
        def boolean_get(df, col):
            try:
                v = df.get(col, None)
                return v == True if v.dtype==bool else v.astype(str).str.lower() == "true" if v is not None else pd.Series([False]*len(df))
            except Exception:
                return pd.Series([False]*len(df))
        
        shot_filter = (
            (
                (reordered_df["type"] == "Shot")&(
                    (pd.to_numeric(reordered_df.get('shot_statsbomb_xg', 0),errors='coerce') >= 0.08)| 
                    (reordered_df.get('shot_outcome', '') == 'Goal')
                )
            )|
                (reordered_df['type'] == 'Own Goal Against') 
            |
            (
                (reordered_df['type'] == 'Foul Won') & boolean_get(reordered_df, 'foul_won_penalty')))
        shot_row = reordered_df[shot_filter]
        
        # Window selection and penalty logic
        type_ser = reordered_df['type'].astype(str).str.strip().str.lower() if 'type' in reordered_df.columns else pd.Series(dtype=str)
        penalty_mask = type_ser == 'foul won'
        has_penalty_col = 'foul_won_penalty' in reordered_df.columns
        foul_penalty_mask = pd.Series([False] * len(reordered_df))
        if has_penalty_col:
            penalty_vals = reordered_df['foul_won_penalty'].astype(str).str.lower()
            foul_penalty_mask = (penalty_vals == 'true') | (reordered_df['foul_won_penalty'] == True)
        foul_penalty_rows = reordered_df[penalty_mask & foul_penalty_mask]
        foul_row_exists = not foul_penalty_rows.empty

        if not shot_row.empty and not (shot_row.get('shot_type', pd.Series()).eq('Penalty').any()):
            shot_minute = shot_row.iloc[-1]['minute']
            shot_second = shot_row.iloc[-1]['second']
            shot_abs_time = shot_minute * 60 + shot_second
            reordered_df = reordered_df.copy()
            reordered_df['abs_time'] = reordered_df['minute'] * 60 + reordered_df['second']
            reordered_df_special = reordered_df[
                (reordered_df['abs_time'] >= shot_abs_time - 10) &
                (reordered_df['abs_time'] <= shot_abs_time)
            ]
            reordered_df_special = reordered_df_special.drop(columns=['abs_time']) if 'abs_time' in reordered_df_special.columns else reordered_df_special
        elif not shot_row.empty and (shot_row.get('shot_type', pd.Series()).eq('Penalty').any()):
            reordered_df_special = reordered_df
        elif foul_row_exists:
            # LIMIT to 10 seconds before the Foul Won event
            foul_row = foul_penalty_rows.iloc[-1]
            foul_minute = foul_row['minute']
            foul_second = foul_row['second']
            foul_abs_time = foul_minute * 60 + foul_second
            reordered_df = reordered_df.copy()
            reordered_df['abs_time'] = reordered_df['minute'] * 60 + reordered_df['second']
            reordered_df_special = reordered_df[
                (reordered_df['abs_time'] >= foul_abs_time - 10) &
                (reordered_df['abs_time'] <= foul_abs_time)
            ]
            reordered_df_special = reordered_df_special.drop(columns=['abs_time']) if 'abs_time' in reordered_df_special.columns else reordered_df_special
        else:
            reordered_df_special = reordered_df.iloc[0:0]

        # --- SHOT TEAM logic (robust, notebook-matching) ---
        shot_team = np.nan
        if not reordered_df_special.empty and 'type' in reordered_df_special.columns:
            foul_won_rows = None
            if 'foul_won_penalty' in reordered_df_special.columns:
                penalty_col = reordered_df_special['foul_won_penalty']
                penalty_mask = (
                    (penalty_col == True) |
                    (penalty_col.astype(str).str.lower() == 'true')
                )
                foul_won_rows = reordered_df_special[
                    (reordered_df_special['type'] == 'Foul Won') & penalty_mask
                ]
            else:
                foul_won_rows = reordered_df_special[reordered_df_special['type'] == 'Foul Won']
            if foul_won_rows is not None and not foul_won_rows.empty:
                shot_team = foul_won_rows['team'].iloc[0]
            else:
                shot_rows = reordered_df_special[reordered_df_special["type"] == 'Shot']
                own_goal_rows = reordered_df_special[reordered_df_special["type"] == 'Own Goal Against']
                if not shot_rows.empty:
                    shot_team = shot_rows['team'].iloc[0]
                elif not own_goal_rows.empty:
                    og_team = own_goal_rows['team'].iloc[0]
                    teams = pd.unique(reordered_df_special['team'].dropna())
                    shot_tm_cand = [t for t in teams if t != og_team]
                    shot_team = shot_tm_cand[0] if shot_tm_cand else np.nan
                else:
                    shot_team = np.nan
        else:
            shot_team = np.nan
        
        # === HIGH TURNOVER ===
        high_turnover_list = []
        if not reordered_df_special.empty:
            reordered_df_special = reordered_df_special.copy()
            events_arr = reordered_df_special.reset_index(drop=False)
            for cur_idx, row in events_arr.iterrows():
                is_high = False
                if row.get('type', None) in ('Ball Recovery', 'Interception'):
                    loc = row.get('location', None)
                    is_shot_team_ev = ('team' in row and row['team'] == shot_team)
                    if isinstance(loc, str):
                        try:
                            loc_eval = ast.literal_eval(loc)
                            loc = loc_eval if isinstance(loc_eval, (list, tuple)) else loc
                        except Exception:
                            loc = None
                    high_x = isinstance(loc, (list, tuple)) and len(loc)==2 and float(loc[0])>60
                    if is_shot_team_ev and high_x:
                        start_idx = None
                        for prev_idx in range(cur_idx-1, -1, -1):
                            prev_row = events_arr.iloc[prev_idx]
                            if prev_row.get('team', None) == shot_team:
                                start_idx = prev_idx
                                break
                        has_other_team_event = False
                        if start_idx is not None:
                            opp_team_slice = events_arr.iloc[start_idx+1: cur_idx]
                            for _, opp_row in opp_team_slice.iterrows():
                                if opp_row.get('type', None) in ('Goal Keeper', 'Pressure', 'Duel', 'Block'):
                                    continue
                                opteam = opp_row.get('team', None)
                                if opteam != shot_team and pd.notna(opteam):
                                    has_other_team_event = True
                                    break
                        if has_other_team_event:
                            is_high = True
                high_turnover_list.append(is_high)
            reordered_df_special['High Turnover?'] = high_turnover_list
        else:
            reordered_df_special['High Turnover?'] = []
        
        # Precompute data for legend/drawing
        ht_x_thresholds=[]
        if 'High Turnover?' in reordered_df_special.columns:
            for _, row in reordered_df_special.iterrows():
                if row.get('High Turnover?', False):
                    x, _ = get_xy(row.get('location'))
                    if not math.isnan(x):
                        ht_x_thresholds.append(x)
        ht_x_thresholds = sorted(set(ht_x_thresholds))
        
        shots = reordered_df_special[reordered_df_special['type'] == 'Shot'].sort_values(['minute','second','timestamp'] if 'timestamp' in reordered_df_special.columns else ['minute','second'])
        shot_indices = list(shots.index)
        shot_numbers = {idx: num+1 for num, idx in enumerate(shot_indices)}
        shot_player_names = {idx: shots.loc[idx].get('player', '') for idx in shot_indices}
        shot_types_per_shot = {}
        if not shots.empty and 'shot_type' in shots.columns:
            for idx, row in shots.iterrows():
                stype = row['shot_type']
                if isinstance(stype, str) and stype.strip() != "":
                    if stype.strip().lower() == "penalty":
                        shot_types_per_shot[idx] = "Penalty"
                    elif stype.strip().lower() == "free kick":
                        shot_types_per_shot[idx] = "Free Kick"
        
        def get_passes_deflected_flags(df, shot_team):
            events_list=list(df.iterrows())
            pass_deflected={}
            for idx in range(len(events_list)):
                ev_idx, ev = events_list[idx]
                if ev.get("type", None)=="Pass" and team_is_shot_team(ev, shot_team):
                    immediate_block = False
                    if idx+1 < len(events_list):
                        _, next_ev = events_list[idx+1]
                        if next_ev.get("type") == "Block" and not team_is_shot_team(next_ev, shot_team):
                            immediate_block = True
                    own_deflected = False
                    pd_col = ev.get('pass_deflected', None)
                    if pd_col is True or (isinstance(pd_col, (np.bool_, bool)) and pd_col):
                        own_deflected = True
                    pass_deflected[ev_idx] = immediate_block or own_deflected
            return pass_deflected
        
        def get_shots_deflected_flags(df, shot_team):
            events_list=list(df.iterrows())
            shot_deflected={}
            for idx in range(len(events_list)):
                ev_idx, ev = events_list[idx]
                if ev.get("type", None)=="Shot" and team_is_shot_team(ev, shot_team):
                    if idx+1 < len(events_list):
                        _, next_ev = events_list[idx+1]
                        if next_ev.get("type") == "Block" and not team_is_shot_team(next_ev, shot_team):
                            shot_deflected[ev_idx]=True
                        else:
                            shot_deflected[ev_idx]=False
                    else:
                        shot_deflected[ev_idx]=False
            return shot_deflected
        
        pass_deflected_flags = get_passes_deflected_flags(reordered_df_special, shot_team)
        shot_deflected_flags = get_shots_deflected_flags(reordered_df_special, shot_team)
        
        # --- BEGIN REAL PLOT ---
        fig = plt.figure(figsize=(16,8))
        gs = gridspec.GridSpec(1,2,width_ratios=[7,2],wspace=0.01)
        ax = fig.add_subplot(gs[0])
        for xthresh in ht_x_thresholds:
            ax.add_patch(patches.Rectangle((xthresh, 0),120 - xthresh,80,facecolor='#fdfdbb',edgecolor='none',zorder=0,alpha=0.78 if len(ht_x_thresholds)==1 else 0.55))
        
        # draw pitch
        ax = draw_pitch(ax)
        
        # precompute artificial carries etc
        artificial_carry_indices = set()
        rows_list = list(reordered_df_special.iterrows())
        for n in range(len(rows_list)-1):
            i1, ev1 = rows_list[n]
            i2, ev2 = rows_list[n+1]
            if ev1.get("type",None)=="Ball Receipt*" and ev2.get("type",None)=="Pass" and ev1.get("player",None)==ev2.get("player",None):
                s1,s2 = get_xy(ev1.get('location')),get_xy(ev2.get('location'))
                if not(math.isnan(s1[0]) or math.isnan(s2[0])):
                    if abs(s2[0]-s1[0]) >= 3.0:
                        artificial_carry_indices.add((i1,i2))
        
        special_intercept_ballreceipt_indices = set()
        for n in range(len(rows_list)-1):
            i1, ev1 = rows_list[n]
            i2, ev2 = rows_list[n+1]
            if ev1.get("type",None)=="Interception" and not team_is_shot_team(ev1, shot_team) and ev2.get("type",None)=="Ball Receipt*" and team_is_shot_team(ev2, shot_team):
                x, _ = get_xy(ev1.get('location'))
                if not math.isnan(x):
                    special_intercept_ballreceipt_indices.add(i1)
        
        # --- PLOT LOOP (all event types) ---
        for i, event in reordered_df_special.iterrows():
            typ = event.get('type', None)
            if pd.isna(typ):
                continue
            player = get_player(event)
            player_short = format_player_name(player)

            if typ == "Own Goal Against":
                start_x, start_y = get_xy(event.get('location'))
                end_x, end_y = get_xy(event.get('shot_end_location')) if 'shot_end_location' in event and pd.notna(event['shot_end_location']) else (np.nan, np.nan)
                start_y_flipped = flip_y(start_y)
                end_y_flipped = flip_y(end_y)
                start_x_flipped = flip_x(start_x)
                if not np.isnan(start_x) and not np.isnan(end_x):
                    ax.plot([start_x, end_x], [start_y_flipped, end_y_flipped], color='red', linestyle=':', lw=4.0, alpha=0.96, zorder=15)
                if player_short:
                    ax.text(start_x_flipped, start_y_flipped, "OG", fontsize=8, color='red', verticalalignment='bottom', horizontalalignment='right', fontweight='bold', zorder=41)
                    ax.text(start_x_flipped, start_y_flipped, player_short, fontsize=8, color='red', verticalalignment='top', horizontalalignment='right', fontweight='bold', zorder=41)
                continue

            # ---------- DUEL AND DISPOSSESSED HANDLING ----------
            if typ == "Duel":
                x, y = get_xy(event.get('location'))
                x_flipped = flip_x(x)
                duel_color = '#ffc0cb'
                duel_fontsize = 7
                if player_short:
                    ax.text(x_flipped, y, player_short, fontsize=duel_fontsize, color=duel_color, fontweight='bold', verticalalignment='center', horizontalalignment='center', zorder=55)
                continue

            if typ == "Dispossessed":
                x, y = get_xy(event.get('location'))
                y_flipped = flip_y(y)
                marker_size = 21
                marker_lw = 2.5
                if team_is_shot_team(event, shot_team):
                    ax.plot(x, y_flipped, marker='o', markersize=marker_size, markeredgecolor='green', markerfacecolor='none', lw=marker_lw, zorder=30)
                else:
                    ax.plot(flip_x(x), y, marker='o', markersize=marker_size, markeredgecolor='red', markerfacecolor='none', lw=marker_lw, zorder=30)
                continue

            # --------------- FOUL WON / FOUL COMMITTED -------------------
            if typ == "Foul Won":
                x, y = get_xy(event.get('location'))
                y_flipped = flip_y(y)
                txt = "FOULED"
                if team_is_shot_team(event, shot_team):
                    ax.text(x, y_flipped, txt, fontsize=10, color='green', verticalalignment='bottom', horizontalalignment='center', fontweight='bold', zorder=58)
                else:
                    ax.text(flip_x(x), y, txt, fontsize=10, color='red', verticalalignment='bottom', horizontalalignment='center', fontweight='bold', zorder=58)
                continue

            if typ == "Foul Committed":
                x, y = get_xy(event.get('location'))
                y_flipped = flip_y(y)
                if player_short:
                    if team_is_shot_team(event, shot_team):
                        ax.text(x, y_flipped, player_short, fontsize=7, color='green', verticalalignment='top', horizontalalignment='center', fontweight='bold', zorder=57)
                    else:
                        ax.text(flip_x(x), y, player_short, fontsize=7, color='red', verticalalignment='top', horizontalalignment='center', fontweight='bold', zorder=57)
                continue

            if typ == "Pass" and not team_is_shot_team(event, shot_team):
                start_x, start_y = get_xy(event.get('location'))
                end_x, end_y = get_xy(event.get('pass_end_location'))
                start_x_flipped = flip_x(start_x)
                end_x_flipped = flip_x(end_x)
                start_y_flipped = start_y
                end_y_flipped = end_y
                pass_type = event.get('pass_type', None)
                if not (np.isnan(start_x_flipped) or np.isnan(end_x_flipped)):
                    ax.plot([start_x_flipped, end_x_flipped], [start_y_flipped, end_y_flipped],
                            color='red', linestyle=':', lw=2.2, alpha=0.92, zorder=13)
                    if player_short:
                        ax.text(start_x_flipped, start_y_flipped, player_short, fontsize=7,
                                color='red', verticalalignment='top', horizontalalignment='right', zorder=40)
                    if (isinstance(pass_type, str) and pass_type.strip().lower() == "corner"):
                        ax.text(start_x_flipped, start_y_flipped + 2.2, "Corner", fontsize=7, color='#9467bd',
                                ha='center', va='bottom', fontweight='bold', zorder=42)
                continue

            if typ == "Pass" and team_is_shot_team(event, shot_team):
                start_x, start_y = get_xy(event.get('location'))
                end_x, end_y = get_xy(event.get('pass_end_location'))
                start_y_flipped = flip_y(start_y)
                end_y_flipped = flip_y(end_y)
                is_deflected = pass_deflected_flags.get(i, False)
                pass_type = event.get('pass_type', None)
                if not (np.isnan(start_x) or np.isnan(end_x)):
                    if is_deflected:
                        plot_squiggly(ax, start_x, start_y_flipped, end_x, end_y_flipped, color='black', lw=2, zorder=2)
                        ax.plot([start_x, end_x], [start_y_flipped, end_y_flipped], color='black', linestyle=':', lw=2, alpha=0.45, zorder=2)
                    else:
                        ax.plot([start_x, end_x], [start_y_flipped, end_y_flipped], color='black', linestyle=':', lw=2, alpha=0.85, zorder=2)
                    if player_short:
                        ax.text(start_x, start_y_flipped, player_short, fontsize=7, color='black', verticalalignment='top', horizontalalignment='right', zorder=40)
                    if isinstance(pass_type, str) and pass_type.strip().lower() == "corner":
                        ax.text(start_x, start_y_flipped + 2.2, "Corner", fontsize=7, color='#9467bd',
                                ha='center', va='bottom', fontweight='bold', zorder=42)
                continue

            if typ == "Carry":
                start_x, start_y = get_xy(event.get('location'))
                end_x, end_y = get_xy(event.get('carry_end_location'))
                if team_is_shot_team(event, shot_team):
                    start_y_flipped = flip_y(start_y)
                    end_y_flipped = flip_y(end_y)
                    if not (np.isnan(start_x) or np.isnan(end_x)):
                        ax.plot([start_x, end_x], [start_y_flipped, end_y_flipped], color='black', linestyle='-', lw=2, alpha=0.9, zorder=3)
                        if player_short:
                            ax.text(start_x, start_y_flipped, player_short, fontsize=7, color='black', verticalalignment='top', horizontalalignment='right', zorder=40)
                else:
                    start_x_flipped = flip_x(start_x)
                    end_x_flipped = flip_x(end_x)
                    if not (np.isnan(start_x_flipped) or np.isnan(end_x_flipped)):
                        ax.plot([start_x_flipped, end_x_flipped], [start_y, end_y], color='gray', linestyle='-', lw=2, alpha=0.9, zorder=3)
                        if player_short:
                            ax.text(start_x_flipped, start_y, player_short, fontsize=7, color='gray', verticalalignment='top', horizontalalignment='right', zorder=40)
                continue

            if typ == "Dribble":
                start_x, start_y = get_xy(event.get('location'))
                end_x, end_y = get_xy(event.get('dribble_end_location'))
                start_y_flipped = flip_y(start_y)
                end_y_flipped = flip_y(end_y)
                if team_is_shot_team(event, shot_team):
                    line_color = 'green'
                    label_color = 'green'
                else:
                    line_color = 'red'
                    label_color = 'red'
                if (not np.isnan(start_x)) and (not np.isnan(end_x)):
                    plot_squiggly(ax, start_x, start_y_flipped, end_x, end_y_flipped, color=line_color, lw=2, zorder=4)
                    if player_short:
                        ax.text(start_x, start_y_flipped, player_short, fontsize=7, color=label_color, verticalalignment='top', horizontalalignment='left', zorder=40)
                continue

            if typ == "Dribbled Past":
                x, y = get_xy(event.get('location'))
                x_flipped = flip_x(x)
                if not np.isnan(x):
                    ax.plot(x_flipped, y, marker='o', color='red', markersize=7, markeredgewidth=1.7, zorder=9)
                    if player_short:
                        ax.text(x_flipped, y, player_short, fontsize=7, color='red', verticalalignment='bottom', horizontalalignment='left', zorder=40)
                continue

            if typ == "Block" and not team_is_shot_team(event, shot_team):
                x, y = get_xy(event.get('location'))
                x_flipped = flip_x(x)
                y_flipped = y
                if not np.isnan(x_flipped):
                    ax.text(x_flipped, y_flipped, "BLOCK", fontsize=8, ha='center', va='center', color='red', fontweight='bold', zorder=8, rotation=90)
                    if player_short:
                        x_text = flip_x(x)
                        y_text = y
                        ax.text(x_text, y_text, player_short, fontsize=7, color='red',
                                verticalalignment='center', horizontalalignment='left', zorder=40)
                continue

            if typ == "Block" and team_is_shot_team(event, shot_team):
                x, y = get_xy(event.get('location'))
                y_flipped = flip_y(y)
                if not np.isnan(x):
                    ax.text(x, y_flipped, "BLOCK", fontsize=8, ha='center', va='center', color='green', fontweight='bold', zorder=8, rotation=-90)
                    if player_short:
                        ax.text(x, y_flipped, player_short, fontsize=7, color='green', verticalalignment='center', horizontalalignment='left', zorder=40)
                continue

            if typ == "Ball Recovery":
                x, y = get_xy(event.get('location'))
                y_flipped = flip_y(y)
                if not np.isnan(x):
                    if team_is_shot_team(event, shot_team):
                        ax.plot(x, y_flipped, marker='o', color='green', markersize=15, markeredgewidth=2, markeredgecolor='black', zorder=6)
                        txt_color = 'green'
                        if player_short:
                            ax.text(x, y_flipped, player_short, fontsize=7, color=txt_color, verticalalignment='center', horizontalalignment='center', zorder=40, fontweight='semibold')
                    else:
                        x_flipped = flip_x(x)
                        ax.plot(x_flipped, y, marker='o', color='red', markersize=15, markeredgewidth=2, markeredgecolor='black', zorder=6)
                        txt_color = 'red'
                        if player_short:
                            ax.text(x_flipped, y, player_short, fontsize=7, color=txt_color, verticalalignment='center', horizontalalignment='center', zorder=40, fontweight='semibold')
                continue

            if typ == "Pressure":
                x, y = get_xy(event.get('location'))
                if team_is_shot_team(event, shot_team):
                    y_flipped = flip_y(y)
                    if not np.isnan(x):
                        ax.plot(x, y_flipped, marker='x', color='green', markersize=15, markeredgewidth=3, zorder=6)
                        txt_color = 'green'
                        if player_short:
                            ax.text(x, y_flipped, player_short, fontsize=7, color='green', verticalalignment='top', horizontalalignment='center', zorder=40)
                else:
                    x_flipped = flip_x(x)
                    y_flipped = y
                    if not np.isnan(x_flipped):
                        if player_short:
                            ax.text(x_flipped, y_flipped, player_short, fontsize=7, color='gray',
                                    verticalalignment='top', horizontalalignment='center', zorder=40)
                continue

            if typ == "Clearance":
                start_x, start_y = get_xy(event.get('location'))
                start_x_flipped = flip_x(start_x)
                if not np.isnan(start_x_flipped):
                    if team_is_shot_team(event, shot_team):
                        ax.text(start_x_flipped, start_y, "C", fontsize=8, ha='center', va='center', color='green', fontweight='bold', zorder=12)
                        if player_short:
                            ax.text(start_x_flipped, start_y + 2.0, player_short, fontsize=7, color='green',
                                    ha='center', va='bottom', zorder=14)
                    else:
                        ax.text(start_x_flipped, start_y, "C", fontsize=8, ha='center', va='center', color='red', fontweight='bold', zorder=12)
                        if player_short:
                            ax.text(start_x_flipped, start_y + 2.0, player_short, fontsize=7, color='red',
                                    ha='center', va='bottom', zorder=14)
                continue

            if typ == "Error":
                start_x, start_y = get_xy(event.get('location'))
                start_x_flipped = flip_x(start_x)
                if not np.isnan(start_x_flipped):
                    ax.text(start_x_flipped, start_y, "E", fontsize=8, ha='center', va='center', color='#FF1493', fontweight='bold', zorder=12)
                    if player_short:
                        ax.text(start_x_flipped, start_y + 2.0, player_short, fontsize=7, color='#FF1493',
                                ha='center', va='bottom', zorder=14)
                continue

            if typ == "Shot":
                start_x, start_y = get_xy(event.get('location'))
                end_x, end_y = get_xy(event.get('shot_end_location'))
                start_y_flipped = flip_y(start_y)
                end_y_flipped = flip_y(end_y)
                outcome = event.get('shot_outcome', '').lower() if event.get('shot_outcome') is not None else ""
                if outcome == "goal":
                    line_color = "green"
                else:
                    line_color = "red"
                is_deflected_shot = shot_deflected_flags.get(i, False)
                if not (np.isnan(start_x) or np.isnan(end_x)):
                    if is_deflected_shot:
                        plot_squiggly(ax, start_x, start_y_flipped, end_x, end_y_flipped, color=line_color, lw=2.5, zorder=10)
                        ax.plot([start_x, end_x], [start_y_flipped, end_y_flipped], color=line_color, linestyle='-', lw=2.5, alpha=0.45, zorder=10)
                    else:
                        ax.plot([start_x, end_x], [start_y_flipped, end_y_flipped],
                                color=line_color, linestyle='-', lw=2.5, alpha=0.95, zorder=10)
                    if outcome == 'off target' or outcome == 'blocked':
                        circ = plt.Circle((end_x, end_y_flipped), 1.5, fill=False, edgecolor='red', lw=2.5, zorder=15)
                        ax.add_patch(circ)
                    elif outcome == 'saved':
                        ax.text(end_x, end_y_flipped, "SAVE", fontsize=12, ha='center', va='center', color='red', fontweight='bold', zorder=15)
                    shot_num = shot_numbers.get(i)
                    shot_player = shot_player_names.get(i, player)
                    shot_player_short = format_player_name(shot_player)
                    shot_type_note = ""
                    if i in shot_types_per_shot:
                        if shot_types_per_shot[i] == "Penalty":
                            shot_type_note = "Penalty"
                        elif shot_types_per_shot[i] == "Free Kick":
                            shot_type_note = "Free Kick"
                    if shot_num is not None:
                        y_offset_for_number = 0
                        y_offset_for_shooter = 3.2
                        y_offset_for_shottype = 6.2
                        if shot_type_note:
                            ax.text(start_x, start_y_flipped + y_offset_for_shottype, shot_type_note, fontsize=8, color=line_color,
                                    fontweight='bold', verticalalignment='bottom', horizontalalignment='center', zorder=52)
                        ax.text(start_x, start_y_flipped, f"{shot_num}", fontsize=10, color=line_color, fontweight='bold',
                                verticalalignment='center', horizontalalignment='center', zorder=50, bbox=dict(boxstyle="circle,pad=0.16", fc="white", ec=line_color, lw=2, alpha=0.9))
                        if shot_player_short:
                            ax.text(start_x, start_y_flipped + y_offset_for_shooter, shot_player_short, fontsize=7, color=line_color, fontweight='bold',
                                    verticalalignment='bottom', horizontalalignment='center', zorder=51)
                    elif player_short:
                        ax.text(start_x, start_y_flipped, player_short, fontsize=7, color='red', verticalalignment='bottom', horizontalalignment='center', zorder=40, fontweight='bold')
                continue

            if typ == "Interception":
                x, y = get_xy(event.get('location'))
                x_flipped = flip_x(x)
                y_flipped = flip_y(y)
                is_shot_team = team_is_shot_team(event, shot_team)
                # Check if this interception is followed immediately by shot team Ball Receipt*
                if i in special_intercept_ballreceipt_indices:
                    # Draw a black square with faint yellow fill, smaller size
                    if not np.isnan(x):
                        ax.scatter(x_flipped, y, marker='s', s=55, facecolor='#fffabe', edgecolor='black', linewidth=1.5, zorder=8)
                        if player_short:
                            ax.text(x_flipped, y, player_short, fontsize=7, color='black', verticalalignment='center', horizontalalignment='center', zorder=40, fontweight='normal')
                    continue
                # Standard Interception
                if not np.isnan(x):
                    color = 'green' if is_shot_team else 'red'
                    if is_shot_team:
                        ax.plot(x, y_flipped, marker='s', color=color, markersize=16, markeredgecolor='black', markeredgewidth=2, zorder=7)
                        if player_short:
                            ax.text(x, y_flipped, player_short, fontsize=7, color=color, verticalalignment='center', horizontalalignment='center', zorder=40, fontweight='bold')
                    else:
                        ax.plot(x_flipped, y, marker='s', color=color, markersize=16, markeredgecolor='black', markeredgewidth=2, zorder=7)
                        if player_short:
                            ax.text(x_flipped, y, player_short, fontsize=7, color=color, verticalalignment='center', horizontalalignment='center', zorder=40, fontweight='normal')
                continue

            if typ == "Ball Receipt*":
                # Ball Receipt* -- mainly just for artificial carry logic, no plotting here
                continue

        # --- Draw artificial carries after the event loop ---
        for n in range(len(rows_list) - 1):
            i1, ev1 = rows_list[n]
            i2, ev2 = rows_list[n + 1]
            if (i1, i2) in artificial_carry_indices:
                start_x, start_y = get_xy(ev1.get('location'))
                end_x, end_y = get_xy(ev2.get('location'))
                player = ev1.get('player', None)
                player_short = format_player_name(player)
                carry_team = ev2.get("team", None)
                # Color: like carry, black for shot team, gray for opposition
                if team_is_shot_team(ev2, shot_team):
                    start_y_flipped = flip_y(start_y)
                    end_y_flipped = flip_y(end_y)
                    ax.plot([start_x, end_x], [start_y_flipped, end_y_flipped], color='black', linestyle='-', lw=2, alpha=0.6, zorder=3)
                else:
                    start_x_flipped = flip_x(start_x)
                    end_x_flipped = flip_x(end_x)
                    ax.plot([start_x_flipped, end_x_flipped], [start_y, end_y], color='gray', linestyle='-', lw=2, alpha=0.6, zorder=3)

        # --- LEGEND ---
        failed_interception_legend = mlines.Line2D([],[],marker='s',markersize=9,markerfacecolor='#fffabe', markeredgecolor='black',markeredgewidth=1.5,linestyle='None',lw=0,color='black',label='Failed Interception')
        legend_elements = [mlines.Line2D([],[],color='black',linestyle=':',lw=2,label='Pass (Shot Team)'),mlines.Line2D([],[],color='red',linestyle=':',lw=2.2,label='Pass (Opposition)'),mlines.Line2D([],[],color='black',linestyle='-',lw=2,label='Carry (Shot Team)'),mlines.Line2D([],[],color='gray',linestyle='-',lw=2,label='Carry (Opposition)'),mlines.Line2D([],[],color='green',lw=2,linestyle=(0,(6,3,2,3)),label='Dribble (Shot Team)'),mlines.Line2D([],[],color='red',lw=2,linestyle=(0,(6,3,2,3)),label='Dribble (Opposition)'),mlines.Line2D([],[],color='red',marker='o',markersize=7,lw=0,label='Dribbled Past'),mlines.Line2D([],[],color='red',marker='',lw=0,label='Block',linestyle='None'),mlines.Line2D([],[],color='green',marker='o',markersize=10,lw=0,label='Ball Recovery (Shot Team)'),mlines.Line2D([],[],color='red',marker='o',markersize=10,lw=0,label='Ball Recovery (Opposition)'),mlines.Line2D([],[],color='green',marker='x',markersize=10,lw=0,label='Pressure (Shot Team)'),mlines.Line2D([],[],color='gray',marker='x',markersize=6,lw=0,label='Pressure (Opposition)'),mlines.Line2D([],[],color='green',linestyle=':',lw=2.3,label='Clearance (Shot Team)'),mlines.Line2D([],[],color='red',linestyle=':',lw=2.3,label='Clearance (Opposition)'),mlines.Line2D([],[],color='green',linestyle='-',lw=2.5,label='Shot Path: GOAL'),mlines.Line2D([],[],color='red',linestyle='-',lw=2.5,label='Shot Path: Not Goal'),mpatches.Patch(facecolor='none',edgecolor='red',linewidth=2,label='Shot End: Off Target or Blocked',alpha=1),mlines.Line2D([],[],color='red',marker='$🚫$',markersize=16,lw=0,label='Shot End: Saved'),mlines.Line2D([],[],color='green',marker='s',markersize=10,lw=0,label='Interception (Shot Team)'),mlines.Line2D([],[],color='red',marker='s',markersize=10,lw=0,label='Interception (Opposition)'),failed_interception_legend,mlines.Line2D([],[],marker='o',color='w',markerfacecolor='w',markeredgecolor='black',markeredgewidth=2,lw=0,label='Shot Order'),mlines.Line2D([],[],marker=None,color='w',lw=0,label="Shooter's name shown above shot number"),mlines.Line2D([],[],marker=None,color='w',lw=0,label="('Penalty'/'Free Kick' shown above shot number)")]
        ax_legend = fig.add_subplot(gs[1])
        ax_legend.axis('off')
        legend = ax_legend.legend(handles=legend_elements,loc='center left',fontsize=9,frameon=True,ncol=1,title='Event Types',borderaxespad=0.5,columnspacing=0.6,handletextpad=0.5,labelspacing=0.3,borderpad=0.4,handlelength=2.1)
        
        # --- INFO CARD (robust to Penalty Won) ---
        info_note, who, when, xg, outcome, score_string = None, 'N/A', 'N/A', 'N/A', 'N/A', 'N/A'
        def to_f_last(name):
            if not isinstance(name, str) or name.strip() == '' or name == 'N/A':
                return 'N/A'
            parts = name.strip().split()
            if len(parts) >= 2:
                return f"{parts[0][0]}. {parts[-1]}"
            else:
                return name

        shot_row_check = not shot_row.empty
        foul_rows = pd.DataFrame()
        if not reordered_df_special.empty and "type" in reordered_df_special.columns:
            type_ser = reordered_df_special["type"]
            penalty_mask = type_ser.astype(str).str.strip().str.lower() == "foul won"
            has_penalty_col = "foul_won_penalty" in reordered_df_special.columns
            if has_penalty_col:
                penalty_vals = reordered_df_special["foul_won_penalty"].astype(str).str.lower()
                foul_penalty_mask = (penalty_vals == "true") | (reordered_df_special["foul_won_penalty"] == True)
                foul_rows = reordered_df_special[penalty_mask & foul_penalty_mask]
            else:
                foul_rows = reordered_df_special[penalty_mask]
                
        if shot_row_check:
            sr = shot_row.iloc[-1]
            who = to_f_last(sr.get('player', 'N/A'))
            xg_val = sr.get('shot_statsbomb_xg', 'N/A')
            if isinstance(xg_val, (int, float)):
                xg = round(xg_val, 2)
            else:
                xg = xg_val
            shot_type = sr.get('shot_type', '')
            if isinstance(shot_type, str) and shot_type.strip().lower() == 'penalty':
                info_note = '(Penalty)'
            elif isinstance(shot_type, str) and shot_type.strip().lower() == 'free kick':
                info_note = '(Free Kick)'
            shot_minute = sr.get('minute', None)
            shot_second = sr.get('second', None)
            if shot_minute is not None and shot_second is not None:
                when = f"{int(shot_minute)}:{int(shot_second):02d}"
            outcome = sr.get('shot_outcome', 'N/A')
        elif not foul_rows.empty:
            fr = foul_rows.iloc[-1]
            who = to_f_last(fr.get('player', 'N/A'))
            info_note = '(Penalty Won)'
            shot_minute = fr.get('minute', None)
            shot_second = fr.get('second', None)
            if shot_minute is not None and shot_second is not None:
                when = f"{int(shot_minute)}:{int(shot_second):02d}"
            outcome = 'Penalty Won'
            xg = 'N/A'
        else:
            0==0
        if info_note is not None and who != 'N/A':
            who = f"{who} {info_note}"

        # Get score at time of shot using full match events DataFrame
        if 'events' in locals() and (not shot_row.empty or (not reordered_df_special.empty and 'Foul Won' in reordered_df_special['type'].values)):
            if not shot_row.empty:
                # Use minute and second ONLY, not timestamp
                min_sec = sr['minute'] * 60 + sr['second'] if 'minute' in sr and 'second' in sr else None
            else:
                fr = foul_rows.iloc[-1]
                min_sec = fr['minute'] * 60 + fr['second'] if 'minute' in fr and 'second' in fr else None

            # This row_time function ONLY uses minute and second (ignores timestamp)
            def row_time(row):
                if 'minute' in row and 'second' in row:
                    return row['minute']*60 + row['second']
                else:
                    return None

            target_time = min_sec
            e = events.copy()
            e['event_time'] = e.apply(row_time, axis=1)
            e = e[~pd.isnull(e['event_time'])]
            e = e[e['event_time'] <= target_time]
            teams = pd.unique(e['team'].dropna())
            team_names = list(teams)
            if shot_team in teams:
                st = shot_team
                other_teams = [t for t in teams if t != shot_team]
                ot = other_teams[0] if other_teams else 'Other'
            else:
                st = team_names[0] if team_names else 'Team1'
                ot = team_names[1] if len(team_names) > 1 else 'Team2'
            def score_for(team):
                goals = e[(e.get('shot_outcome', '')=='Goal') & (e.get('team', None)==team)].shape[0]
                own_goals = e[(e['type']=='Own Goal For') & (e.get('team', None)==team)].shape[0]
                return goals + own_goals
            st_score = score_for(st)
            ot_score = score_for(ot)
            score_string = f"{st[:3]} {st_score}-{ot_score} {ot[:3]}"
        info_cols = ["Who", "When", 'XG', "Result", "Score"]
        info_data = [[who, when, xg, outcome, score_string]]
        widen_factor = 1.42
        right_shift = 0.10
        info_table = ax_legend.table(cellText=info_data, colLabels=info_cols, loc='upper center', cellLoc='center', colLoc='center', bbox=[-0.21+right_shift, 0.88, widen_factor, 0.12])
        info_table.auto_set_font_size(False)
        info_table.set_fontsize(10)
        cell_dict = info_table.get_celld()
        ncols = len(info_cols)
        for (row, col), cell in cell_dict.items():
            cell.set_width(widen_factor/ncols)
            cell.set_edgecolor('black')
            if row == 0:
                cell.set_text_props(weight='bold', color='black')
                cell.set_facecolor('#efefef')
        plt.tight_layout()
        ax.set_title(f"{when} - {shot_team} - {who}", fontsize=18, fontweight='bold')
        buf = io.BytesIO()
        
        plt.savefig(buf, format="png", dpi=150)
        plt.close(fig)
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode("utf-8")
        return {"image_base64": img_base64}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"possession_scene failed: {type(e).__name__}: {e}")

