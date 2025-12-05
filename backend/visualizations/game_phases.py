"""
Game phases analysis module.

Analyzes match divided into phases based on key events (goals, half-time, red cards).
Computes detailed metrics for each phase including possession, shots, box entries, etc.

NOTE: This is a large function extracted from routes/visualizations.py (lines 978-1674).
The full implementation is preserved from the original file.
"""

import pandas as pd
import numpy as np
import json
import ast
import traceback
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from collections import OrderedDict

from utils.coords import _to_xy
from visualizations.helpers import to_point, point_in_rect


async def game_phases(filename: str):
    """
    Analyze match divided into phases based on key events.
    
    Args:
        filename: S3 key of match events file
        
    Returns:
        JSONResponse with phases array and phase_metrics array
        
    Raises:
        HTTPException: File processing errors
    """
    from cache import cache, s3
    
    cache_key = f"phases:{filename}:json"
    
    # Check cache first
    cached_result = cache.get(cache_key, cache_type="game_phases")
    if cached_result is not None:
        return JSONResponse(content=jsonable_encoder(cached_result))
    
    try:
        # Load events with caching
        events = s3.get_dataframe(filename, cache_type="events_df")
        if events is None:
            # Fallback to local file if S3 fails
            try:
                events = pd.read_csv(filename)
            except Exception:
                raise HTTPException(status_code=404, detail=f"Could not load {filename}")

        # Identify teams
        team_names = events.get('possession_team', pd.Series([], dtype=str)).dropna().unique()
        if len(team_names) < 2:
            alt = events.get('team', pd.Series([], dtype=str)).dropna().unique()
            team_names = alt if len(alt) >= 2 else team_names
        if len(team_names) < 2:
            return JSONResponse(content=jsonable_encoder({
                "error": f"Unable to identify two teams. Found: {list(map(str, team_names))}",
                "phases": [],
                "phase_metrics": []
            }))
        home_team, away_team = team_names[:2]

        # Prepare sortable/time helper columns
        ev = events.copy()
        if 'timestamp' in ev.columns:
            ev['timestamp_dt'] = pd.to_datetime(ev['timestamp'], errors='coerce')
        ev['minute_int'] = ev['minute'].fillna(0).astype(int) if 'minute' in ev.columns else 0
        ev['second_int'] = ev['second'].fillna(0).astype(int) if 'second' in ev.columns else 0
        ev['tsec'] = ev['minute_int'] * 60 + ev['second_int']

        sort_cols = []
        if 'possession' in ev.columns:
            sort_cols.append('possession')
        if 'timestamp_dt' in ev.columns:
            sort_cols.append('timestamp_dt')
        elif 'timestamp' in ev.columns:
            sort_cols.append('timestamp')
        elif {'minute_int', 'second_int'} <= set(ev.columns):
            sort_cols.extend(['minute_int', 'second_int'])
        if sort_cols:
            ev = ev.sort_values(sort_cols)

        # Collect Half Start times by period
        half_starts_by_period = {}
        if 'type' in ev.columns and 'period' in ev.columns:
            hs = ev[ev['type'] == 'Half Start']
            if not hs.empty:
                for _, r in hs.iterrows():
                    p = int(r.get('period')) if pd.notna(r.get('period')) else None
                    if p is None:
                        continue
                    tsec = int(r.get('tsec')) if pd.notna(r.get('tsec')) else None
                    if tsec is None:
                        continue
                    half_starts_by_period.setdefault(p, []).append((int(r['minute_int']), int(r['second_int']), tsec))

        # Helpers
        def is_goal(row: pd.Series) -> bool:
            return (row.get('shot_outcome') == 'Goal') or (row.get('type') == 'Own Goal For')

        def awarded_team(row: pd.Series):
            if row.get('shot_outcome') == 'Goal':
                return row.get('possession_team')
            if row.get('type') == 'Own Goal For':
                return row.get('team')
            return None

        # Build phase break marks and score progression
        score = {home_team: 0, away_team: 0}
        marks = OrderedDict()  # (minute, second, period) -> mark
        for _, row in ev.iterrows():
            minute = int(row.get('minute_int', 0) or 0)
            second = int(row.get('second_int', 0) or 0)
            tsec = int(row.get('tsec', minute * 60 + second))
            period_val = int(row.get('period')) if 'period' in row and pd.notna(row.get('period')) else None
            key = (minute, second, period_val)

            reasons = []
            mark_goal_info = None
            score_after = (score[home_team], score[away_team])
            next_phase_start = None  # (min, sec, period)
            scorer = None

            # Half End
            if row.get('type') == 'Half End':
                reasons.append('half_end')
                if period_val is not None:
                    target_period = period_val + 1
                    candidates = half_starts_by_period.get(target_period, [])
                    if candidates:
                        best = min(candidates, key=lambda x: abs(x[2] - tsec))
                        next_phase_start = (best[0], best[1], target_period)

            # Red card
            if (row.get('type') == 'Foul Committed') and (row.get('foul_committed_card') == 'Red Card'):
                reasons.append('red_card')

            # Goal / Own goal for
            if is_goal(row):
                scorer = awarded_team(row)
                event_type = row.get('type')
                own_goal_team = row.get('team') if event_type == 'Own Goal For' else None
                if scorer and (scorer in score):
                    score[scorer] += 1
                    mark_goal_info = {
                        'scorer': scorer,
                        'event_type': event_type,
                        'own_goal_team': own_goal_team,
                    }
                    reasons.append('goal')
                    score_after = (score[home_team], score[away_team])

            # Woodwork/Post/Saved to Post as phase divider (with 30-second caveat)
            # Logic: If there's another shot within 30 seconds AFTER a Woodwork/Post/Saved to Post shot,
            # the phase should end with that later shot. Otherwise, end with the Woodwork/Post shot.
            if row.get('type') == 'Shot':
                shot_outcome = str(row.get('shot_outcome', '')).lower()
                
                # Check if this shot is within 30 seconds of a previous Woodwork/Post/Saved to Post shot
                # If so, and this is the last shot in that sequence, make it a divider
                lookback_start_tsec = max(0, tsec - 30)
                time_mask_back = (ev['tsec'] >= lookback_start_tsec) & (ev['tsec'] < tsec)
                
                if period_val is not None and 'period' in ev.columns:
                    period_int = pd.to_numeric(ev['period'], errors='coerce')
                    same_period_mask_back = (period_int == period_val) & pd.notna(period_int)
                    lookback_events = ev[same_period_mask_back & time_mask_back]
                else:
                    lookback_events = ev[time_mask_back]
                
                # Check for Woodwork/Post/Saved to Post in lookback window
                if not lookback_events.empty:
                    woodwork_shots = lookback_events[
                        (lookback_events['type'] == 'Shot') & 
                        (lookback_events['shot_outcome'].astype(str).str.lower().isin(['woodwork', 'post', 'saved to post']))
                    ]
                    if not woodwork_shots.empty:
                        # Found a Woodwork/Post/Saved to Post shot in the last 30 seconds
                        # Check if this is the last shot within 30 seconds of that Woodwork shot
                        woodwork_tsec = woodwork_shots['tsec'].max()  # Get the most recent one
                        woodwork_lookahead_end = woodwork_tsec + 30
                        
                        # Check if there are any shots after this one within 30 seconds of the Woodwork shot
                        time_mask_forward = (ev['tsec'] > tsec) & (ev['tsec'] <= woodwork_lookahead_end)
                        if period_val is not None and 'period' in ev.columns:
                            period_int = pd.to_numeric(ev['period'], errors='coerce')
                            same_period_mask_forward = (period_int == period_val) & pd.notna(period_int)
                            future_events = ev[same_period_mask_forward & time_mask_forward]
                        else:
                            future_events = ev[time_mask_forward]
                        
                        future_shots = future_events[future_events['type'] == 'Shot']
                        if future_shots.empty:
                            # This is the last shot in the sequence, make it a divider
                            reasons.append('woodwork_post')
                
                # Also handle the case where this IS a Woodwork/Post/Saved to Post shot
                if shot_outcome in ['woodwork', 'post', 'saved to post']:
                    # Check if there are ANY other shots within 30 seconds AFTER this event
                    lookahead_end_tsec = tsec + 30
                    time_mask_forward = (ev['tsec'] > tsec) & (ev['tsec'] <= lookahead_end_tsec)
                    
                    if period_val is not None and 'period' in ev.columns:
                        period_int = pd.to_numeric(ev['period'], errors='coerce')
                        same_period_mask_forward = (period_int == period_val) & pd.notna(period_int)
                        lookahead_events = ev[same_period_mask_forward & time_mask_forward]
                    else:
                        lookahead_events = ev[time_mask_forward]
                    
                    # Check for ANY other shots in lookahead window
                    other_shots = lookahead_events[lookahead_events['type'] == 'Shot'] if not lookahead_events.empty else pd.DataFrame()
                    if other_shots.empty:
                        # No other shots in the next 30 seconds, so this Woodwork/Post shot should divide the phase
                        # (But only if we haven't already added it as a divider from the backward check above)
                        if 'woodwork_post' not in reasons:
                            reasons.append('woodwork_post')

            if reasons:
                if key not in marks:
                    marks[key] = {
                        'minute': minute,
                        'second': second,
                        'period': period_val,
                        'reasons': set(reasons),
                        'goal_info': mark_goal_info,
                        'score_after': score_after,
                        'next_phase_start': next_phase_start,
                    }
                else:
                    marks[key]['reasons'].update(reasons)
                    if mark_goal_info is not None:
                        marks[key]['goal_info'] = mark_goal_info
                        marks[key]['score_after'] = score_after
                    if next_phase_start is not None:
                        marks[key]['next_phase_start'] = next_phase_start

        for m in marks.values():
            m['reasons'] = sorted(list(m['reasons']))

        # Build phases honoring next_phase_start on half_end
        phases = []
        cur_start_min, cur_start_sec, cur_start_period = 0, 0, None
        cur_score_home, cur_score_away = 0, 0
        for (_, _, _), mark in marks.items():
            end_minute, end_second = mark['minute'], mark['second']
            end_period = mark.get('period')
            phase = {
                'phase_idx': len(phases) + 1,
                'score_start': f"{cur_score_home}-{cur_score_away}",
                'start_minute': cur_start_min,
                'start_second': cur_start_sec,
                'start_period': cur_start_period,
                'score_end': f"{mark['score_after'][0]}-{mark['score_after'][1]}",
                'end_minute': end_minute,
                'end_second': end_second,
                'end_period': end_period,
                'goal_info': mark['goal_info'],
                'break_reasons': mark['reasons'],
                }
            phases.append(phase)

            # Next start
            if 'half_end' in mark['reasons'] and mark.get('next_phase_start') is not None:
                ns_min, ns_sec, ns_period = mark['next_phase_start']
                cur_start_min, cur_start_sec, cur_start_period = ns_min, ns_sec, ns_period
            else:
                cur_start_min, cur_start_sec, cur_start_period = end_minute, end_second, end_period
            cur_score_home, cur_score_away = mark['score_after']

        # Final phase to match end
        if phases:
            last_end_minute = phases[-1]['end_minute']
            last_end_second = phases[-1]['end_second']
            last_end_period = phases[-1].get('end_period')
            max_minute = int(ev['minute_int'].max()) if 'minute_int' in ev.columns else last_end_minute
            at_max = ev.loc[ev['minute_int'] == max_minute]
            max_second = int(at_max['second_int'].max()) if not at_max.empty else last_end_second
            if (max_minute, max_second) != (last_end_minute, last_end_second):
                phases.append({
                    'phase_idx': len(phases) + 1,
                    'score_start': f"{cur_score_home}-{cur_score_away}",
                    'start_minute': cur_start_min,
                    'start_second': cur_start_sec,
                    'start_period': cur_start_period,
                    'score_end': None,
                    'end_minute': max_minute,
                    'end_second': max_second,
                    'end_period': last_end_period,
                    'goal_info': None,
                    'break_reasons': ['match_end'],
                })

        # Right penalty box and final-third rectangles
        penalty_box_rect = (102, 18, 120, 62)
        final_third_rect = (80, 0, 120, 80)

        # Helper: score at a given match time (inclusive of that instant)
        def score_at_time(minute_value: int, second_value: int):
            mask_upto = (
                (ev['minute_int'] < int(minute_value)) |
                ((ev['minute_int'] == int(minute_value)) & (ev['second_int'] <= int(second_value)))
            )
            upto = ev.loc[mask_upto]
            goals_normal = upto[(upto.get('type') == 'Shot') & (upto.get('shot_outcome') == 'Goal')]
            own_for = upto[(upto.get('type') == 'Own Goal For')]
            normal_counts = goals_normal.groupby('possession_team').size() if not goals_normal.empty else pd.Series(dtype=int)
            own_counts = own_for.groupby('team').size() if not own_for.empty else pd.Series(dtype=int)
            h = int(normal_counts.get(home_team, 0)) + int(own_counts.get(home_team, 0))
            a = int(normal_counts.get(away_team, 0)) + int(own_counts.get(away_team, 0))
            return {home_team: h, away_team: a}

        # Metrics per phase
        phase_metrics = []
        if phases:
            base_ev = events.copy()
            base_ev['minute_int'] = base_ev['minute'].fillna(0).astype(int) if 'minute' in base_ev.columns else 0
            base_ev['second_int'] = base_ev['second'].fillna(0).astype(int) if 'second' in base_ev.columns else 0
            period_int = pd.to_numeric(base_ev.get('period', pd.Series([np.nan] * len(base_ev))), errors='coerce')
            base_ev['period_int'] = period_int

            for ph in phases:
                sm = int(ph.get('start_minute', 0) or 0)
                ss = int(ph.get('start_second', 0) or 0)
                em = ph.get('end_minute'); em = int(em) if em is not None else sm
                es = ph.get('end_second'); es = int(es) if es is not None else ss
                sp = ph.get('start_period'); sp = int(sp) if sp is not None else None

                # Time range: exclude start instant; include end instant
                base_mask = (
                    (base_ev['minute_int'] > sm) | ((base_ev['minute_int'] == sm) & (base_ev['second_int'] > ss))
                ) & (
                    (base_ev['minute_int'] < em) | ((base_ev['minute_int'] == em) & (base_ev['second_int'] <= es))
                )
                mask = base_mask & (base_ev['period_int'] == sp) if sp is not None else base_mask
                ev_phase = base_ev.loc[mask].copy()

                # Possession by passes
                pass_ev = ev_phase[ev_phase['type'] == 'Pass'].copy() if 'type' in ev_phase.columns else pd.DataFrame()
                denom = len(pass_ev)
                if denom == 0:
                    possession_stats = {home_team: 0.0, away_team: 0.0}
                else:
                    counts = pass_ev.groupby('team').size() if 'team' in pass_ev.columns else pd.Series(dtype=int)
                    possession_stats = {
                        home_team: float(round(float(counts.get(home_team, 0)) / denom * 100)),
                        away_team: float(round(float(counts.get(away_team, 0)) / denom * 100)),
                    }

                # Carries ending inside box
                carry_phase = ev_phase[ev_phase['type'] == 'Carry'].copy() if 'type' in ev_phase.columns else pd.DataFrame()
                if not carry_phase.empty and 'carry_end_location' in carry_phase.columns:
                    carry_phase['point'] = carry_phase['carry_end_location'].apply(to_point)
                    carry_phase['start_point'] = carry_phase['location'].apply(to_point) if 'location' in carry_phase.columns else None
                    carry_phase['in_box'] = carry_phase['point'].apply(lambda pt: point_in_rect(pt, penalty_box_rect))
                    carry_phase['in_final_third'] = carry_phase['point'].apply(lambda pt: point_in_rect(pt, final_third_rect))
                else:
                    carry_phase['in_box'] = []
                    carry_phase['in_final_third'] = []
                carry_counts = carry_phase[carry_phase['in_box']].groupby('team').size() if not carry_phase.empty else pd.Series(dtype=int)
                carry_final_counts = carry_phase[carry_phase['in_final_third']].groupby('team').size() if not carry_phase.empty else pd.Series(dtype=int)
                carries_in_box_per_team = {home_team: int(carry_counts.get(home_team, 0)), away_team: int(carry_counts.get(away_team, 0))}
                carries_in_final_third_per_team = {home_team: int(carry_final_counts.get(home_team, 0)), away_team: int(carry_final_counts.get(away_team, 0))}

                # Passes ending inside box with empty outcome
                if 'type' in ev_phase.columns:
                    pass_mask = (ev_phase['type'] == 'Pass') & (ev_phase.get('pass_outcome').isna() if 'pass_outcome' in ev_phase.columns else True)
                    pass_phase = ev_phase[pass_mask].copy()
                else:
                    pass_phase = pd.DataFrame()
                if not pass_phase.empty and 'pass_end_location' in pass_phase.columns:
                    pass_phase['point'] = pass_phase['pass_end_location'].apply(to_point)
                    pass_phase['start_point'] = pass_phase['location'].apply(to_point) if 'location' in pass_phase.columns else None
                    pass_phase['in_box'] = pass_phase['point'].apply(lambda pt: point_in_rect(pt, penalty_box_rect))
                    pass_phase['in_final_third'] = pass_phase['point'].apply(lambda pt: point_in_rect(pt, final_third_rect))
                else:
                    pass_phase['in_box'] = []
                    pass_phase['in_final_third'] = []
                pass_counts = pass_phase[pass_phase['in_box']].groupby('team').size() if not pass_phase.empty else pd.Series(dtype=int)
                pass_final_counts = pass_phase[pass_phase['in_final_third']].groupby('team').size() if not pass_phase.empty else pd.Series(dtype=int)
                passes_in_box_no_outcome_per_team = {home_team: int(pass_counts.get(home_team, 0)), away_team: int(pass_counts.get(away_team, 0))}
                passes_in_final_third_no_outcome_per_team = {home_team: int(pass_final_counts.get(home_team, 0)), away_team: int(pass_final_counts.get(away_team, 0))}

                # Final third entries (deduplicate by possession across carries and passes)
                home_poss_final, away_poss_final = set(), set()
                if not carry_phase.empty and 'possession' in carry_phase.columns:
                    cf = carry_phase[(carry_phase['in_final_third']) & carry_phase['team'].notna()]
                    for _, r in cf[['team', 'possession']].iterrows():
                        if r['team'] == home_team:
                            home_poss_final.add(int(r['possession']))
                        elif r['team'] == away_team:
                            away_poss_final.add(int(r['possession']))
                if not pass_phase.empty and 'possession' in pass_phase.columns:
                    pf = pass_phase[(pass_phase['in_final_third']) & pass_phase['team'].notna()]
                    for _, r in pf[['team', 'possession']].iterrows():
                        if r['team'] == home_team:
                            home_poss_final.add(int(r['possession']))
                        elif r['team'] == away_team:
                            away_poss_final.add(int(r['possession']))
                final_third_entries_dedup = {home_team: len(home_poss_final), away_team: len(away_poss_final)}

                # Helper function to determine box entry outcome color
                def get_box_entry_color(row, team_name, ev_phase_df):
                    """Check next 10 seconds for goal, own goal, or shot"""
                    if 'timestamp' not in row.index or 'minute_int' not in row.index or 'second_int' not in row.index:
                        return '#FF9800'  # default carry color or '#2196F3' for pass
                    
                    entry_timestamp = row.get('timestamp')
                    entry_minute = row.get('minute_int')
                    entry_second = row.get('second_int')
                    
                    if pd.isna(entry_timestamp) or pd.isna(entry_minute) or pd.isna(entry_second):
                        return '#FF9800'
                    
                    # Look for events in next 10 seconds
                    future_events = ev_phase_df[
                        (ev_phase_df['minute_int'] == entry_minute) & (ev_phase_df['second_int'] > entry_second) & (ev_phase_df['second_int'] <= entry_second + 10) |
                        (ev_phase_df['minute_int'] == entry_minute + 1) & (ev_phase_df['second_int'] <= (entry_second + 10) % 60)
                    ]
                    
                    # Check for goal by same team
                    goals = future_events[
                        (future_events['type'] == 'Shot') & 
                        (future_events.get('shot_outcome') == 'Goal') &
                        (future_events['possession_team'] == team_name)
                    ]
                    if not goals.empty:
                        return '#00C853'  # Green for goal
                    
                    # Check for own goal for (helps attacking team)
                    own_goals = future_events[
                        (future_events['type'] == 'Own Goal For') &
                        (future_events['team'] == team_name)
                    ]
                    if not own_goals.empty:
                        return '#69F0AE'  # Light green for own goal
                    
                    # Check for any shot by same team
                    shots = future_events[
                        (future_events['type'] == 'Shot') &
                        (future_events['possession_team'] == team_name)
                    ]
                    if not shots.empty:
                        return '#FFF59D'  # Pale yellow for shot
                    
                    return None  # Use default type-based color

                # Box entries dedup (by possession across carries and passes)
                home_poss_box, away_poss_box = set(), set()
                home_box_locations, away_box_locations = [], []
                
                if not carry_phase.empty and 'possession' in carry_phase.columns:
                    cb = carry_phase[(carry_phase['in_box']) & carry_phase['team'].notna()].copy()
                    for idx, r in cb.iterrows():
                        poss_num = int(r['possession'])
                        if r['team'] == home_team:
                            if poss_num not in home_poss_box:
                                home_poss_box.add(poss_num)
                                if r['start_point'] and r['point']:
                                    color = get_box_entry_color(r, home_team, ev_phase)
                                    home_box_locations.append({
                                        'x1': r['start_point'][0], 'y1': r['start_point'][1],
                                        'x2': r['point'][0], 'y2': r['point'][1],
                                        'type': 'carry',
                                        'color': color
                                    })
                        elif r['team'] == away_team:
                            if poss_num not in away_poss_box:
                                away_poss_box.add(poss_num)
                                if r['start_point'] and r['point']:
                                    color = get_box_entry_color(r, away_team, ev_phase)
                                    away_box_locations.append({
                                        'x1': r['start_point'][0], 'y1': r['start_point'][1],
                                        'x2': r['point'][0], 'y2': r['point'][1],
                                        'type': 'carry',
                                        'color': color
                                    })
                
                if not pass_phase.empty and 'possession' in pass_phase.columns:
                    pb = pass_phase[(pass_phase['in_box']) & pass_phase['team'].notna()].copy()
                    for idx, r in pb.iterrows():
                        poss_num = int(r['possession'])
                        if r['team'] == home_team:
                            if poss_num not in home_poss_box:
                                home_poss_box.add(poss_num)
                                if r['start_point'] and r['point']:
                                    color = get_box_entry_color(r, home_team, ev_phase)
                                    home_box_locations.append({
                                        'x1': r['start_point'][0], 'y1': r['start_point'][1],
                                        'x2': r['point'][0], 'y2': r['point'][1],
                                        'type': 'pass',
                                        'color': color  #0==0
                                    })
                        elif r['team'] == away_team:
                            if poss_num not in away_poss_box:
                                away_poss_box.add(poss_num)
                                if r['start_point'] and r['point']:
                                    color = get_box_entry_color(r, away_team, ev_phase)
                                    away_box_locations.append({
                                        'x1': r['start_point'][0], 'y1': r['start_point'][1],
                                        'x2': r['point'][0], 'y2': r['point'][1],
                                        'type': 'pass',
                                        'color': color
                                    })
                
                box_entries_dedup = {home_team: len(home_poss_box), away_team: len(away_poss_box)}
                box_entry_locations = {home_team: home_box_locations, away_team: away_box_locations}

                # Fouls and cards
                fouls = ev_phase[ev_phase['type'] == 'Foul Committed'].copy() if 'type' in ev_phase.columns else pd.DataFrame()
                foul_counts = fouls.groupby('team').size().reindex([home_team, away_team], fill_value=0).astype(int) if not fouls.empty and 'team' in fouls.columns else pd.Series({home_team: 0, away_team: 0})
                fouls_per_team = {home_team: int(foul_counts.get(home_team, 0)), away_team: int(foul_counts.get(away_team, 0))}
                yellow_cards = fouls[fouls.get('foul_committed_card') == 'Yellow Card'] if not fouls.empty else pd.DataFrame()
                red_cards = fouls[fouls.get('foul_committed_card') == 'Red Card'] if not fouls.empty else pd.DataFrame()
                yellow_counts = yellow_cards.groupby('team').size().reindex([home_team, away_team], fill_value=0).astype(int) if not yellow_cards.empty and 'team' in yellow_cards.columns else pd.Series({home_team: 0, away_team: 0})
                red_counts = red_cards.groupby('team').size().reindex([home_team, away_team], fill_value=0).astype(int) if not red_cards.empty and 'team' in red_cards.columns else pd.Series({home_team: 0, away_team: 0})
                cards_per_team = {home_team: {'yellow': int(yellow_counts.get(home_team, 0)), 'red': int(red_counts.get(home_team, 0))}, away_team: {'yellow': int(yellow_counts.get(away_team, 0)), 'red': int(red_counts.get(away_team, 0))}}

                # Shots buckets
                shots = ev_phase[ev_phase['type'] == 'Shot'].copy() if 'type' in ev_phase.columns else pd.DataFrame()
                if not shots.empty and 'shot_statsbomb_xg' in shots.columns:
                    shots['xg'] = pd.to_numeric(shots['shot_statsbomb_xg'], errors='coerce')
                else:
                    shots['xg'] = np.nan if not shots.empty else pd.Series(dtype=float)
                # Deduplicate chances within 2 seconds per team; classify each cluster
                chances_per_team = {home_team: {'ok': 0, 'good': 0}, away_team: {'ok': 0, 'good': 0}}
                if not shots.empty and {'minute', 'second', 'team'}.issubset(shots.columns):
                    shots = shots.copy()
                    shots['abs_sec'] = pd.to_numeric(shots.get('minute'), errors='coerce').fillna(0).astype(int) * 60 + pd.to_numeric(shots.get('second'), errors='coerce').fillna(0).astype(int)
                    # Keep only shots that qualify as chances
                    shots_chances = shots[shots['xg'] >= 0.08]
                    for team_name in [home_team, away_team]:
                        grp = shots_chances[shots_chances['team'] == team_name].sort_values('abs_sec')
                        last_time = None
                        current_max_xg = None
                        def flush_cluster():
                            nonlocal chances_per_team, current_max_xg
                            if current_max_xg is None:
                                return
                            if current_max_xg >= 0.27:
                                chances_per_team[team_name]['good'] += 1
                            else:
                                chances_per_team[team_name]['ok'] += 1
                        for _, r in grp.iterrows():
                            t = int(r['abs_sec'])
                            xg_val = float(r['xg']) if pd.notna(r['xg']) else 0.0
                            if last_time is None or (t - last_time) > 2:
                                flush_cluster()
                                last_time = t
                                current_max_xg = xg_val
                            else:
                                last_time = t
                                if xg_val > (current_max_xg or 0):
                                    current_max_xg = xg_val
                        flush_cluster()

                # Shot totals and on-target (Goal or Saved)
                shots_total_counts = shots.groupby('team').size().reindex([home_team, away_team], fill_value=0).astype(int) if not shots.empty and 'team' in shots.columns else pd.Series({home_team: 0, away_team: 0})
                if not shots.empty and 'shot_outcome' in shots.columns and 'team' in shots.columns:
                    sot_mask = shots['shot_outcome'].astype(str).str.lower().isin(['goal', 'saved'])
                    shots_on_target = shots.loc[sot_mask]
                    shots_on_target_counts = shots_on_target.groupby('team').size().reindex([home_team, away_team], fill_value=0).astype(int)
                else:
                    shots_on_target_counts = pd.Series({home_team: 0, away_team: 0})
                shots_summary = {
                    home_team: {'total': int(shots_total_counts.get(home_team, 0)), 'on_target': int(shots_on_target_counts.get(home_team, 0))},
                    away_team: {'total': int(shots_total_counts.get(away_team, 0)), 'on_target': int(shots_on_target_counts.get(away_team, 0))}
                }

                # Penalties per team in this phase
                if not shots.empty and 'shot_type' in shots.columns and 'team' in shots.columns:
                    pens_mask = shots['shot_type'].astype(str).str.lower() == 'penalty'
                    pens_counts = shots.loc[pens_mask].groupby('team').size().reindex([home_team, away_team], fill_value=0).astype(int)
                else:
                    pens_counts = pd.Series({home_team: 0, away_team: 0})
                penalties_per_team = {home_team: int(pens_counts.get(home_team, 0)), away_team: int(pens_counts.get(away_team, 0))}

                # Goals per phase (robust)
                goals_mask = (ev_phase.get('shot_outcome', '') == 'Goal') | (ev_phase.get('type', '') == 'Own Goal For') if not ev_phase.empty else pd.Series([])
                goals_phase = ev_phase.loc[goals_mask].copy() if not ev_phase.empty else pd.DataFrame()
                def awarded_team_row(row):
                    if row.get('shot_outcome') == 'Goal':
                        return row.get('possession_team')
                    if row.get('type') == 'Own Goal For':
                        return row.get('team')
                    return None
                if not goals_phase.empty:
                    goals_phase['goal_for'] = goals_phase.apply(awarded_team_row, axis=1)
                g_counts = goals_phase['goal_for'].value_counts() if not goals_phase.empty and 'goal_for' in goals_phase.columns else pd.Series({})
                goals_per_team = {home_team: int(g_counts.get(home_team, 0)), away_team: int(g_counts.get(away_team, 0))}

                # Scores at phase boundaries (inclusive at those instants)
                score_start_counts = score_at_time(sm, ss)
                score_end_counts = score_at_time(em, es)

                # ===== SHOT MAP DATA PER TEAM (including red cards and own goals) =====
                shot_map_data = {home_team: [], away_team: []}
                
                # Add shots
                if not shots.empty and {'location', 'team', 'shot_outcome'}.issubset(shots.columns):
                    for _, shot_row in shots.iterrows():
                        shot_team_name = shot_row.get('team')
                        if shot_team_name not in [home_team, away_team]:
                            continue
                        
                        # Extract location
                        loc = shot_row.get('location')
                        if isinstance(loc, str):
                            try:
                                loc = json.loads(loc)
                            except:
                                try:
                                    loc = ast.literal_eval(loc)
                                except:
                                    continue
                        
                        if not isinstance(loc, (list, tuple)) or len(loc) < 2:
                            continue
                        
                        x, y = float(loc[0]), float(loc[1])
                        xg_val = float(shot_row.get('xg', 0)) if pd.notna(shot_row.get('xg')) else 0.0
                        outcome = str(shot_row.get('shot_outcome', '')).lower()
                        
                        # Determine color based on rules
                        if outcome == 'goal':
                            color = 'green'
                        elif 0.08 <= xg_val < 0.27:
                            color = 'orange'
                        elif xg_val >= 0.27:
                            color = 'yellow'
                        else:
                            color = 'black'
                        
                        shot_map_data[shot_team_name].append({
                            'x': x,
                            'y': y,
                            'xg': round(xg_val, 3),
                            'outcome': outcome,
                            'color': color,
                            'player': str(shot_row.get('player', '')),
                            'event_type': 'shot'
                        })
                
                # Add Red Cards
                if not fouls.empty and 'foul_committed_card' in fouls.columns:
                    red_cards_phase = fouls[fouls['foul_committed_card'] == 'Red Card']
                    if not red_cards_phase.empty and 'location' in red_cards_phase.columns:
                        for _, rc_row in red_cards_phase.iterrows():
                            rc_team_name = rc_row.get('team')
                            if rc_team_name not in [home_team, away_team]:
                                continue
                            
                            loc = rc_row.get('location')
                            if isinstance(loc, str):
                                try:
                                    loc = json.loads(loc)
                                except:
                                    try:
                                        loc = ast.literal_eval(loc)
                                    except:
                                        continue
                            
                            if not isinstance(loc, (list, tuple)) or len(loc) < 2:
                                continue
                            
                            x, y = float(loc[0]), float(loc[1])
                            shot_map_data[rc_team_name].append({
                                'x': x,
                                'y': y,
                                'color': 'red',
                                'player': str(rc_row.get('player', '')),
                                'event_type': 'red_card'
                            })
                
                # Add Own Goals For
                own_goals_phase = ev_phase[ev_phase['type'] == 'Own Goal For'] if 'type' in ev_phase.columns else pd.DataFrame()
                if not own_goals_phase.empty and 'location' in own_goals_phase.columns:
                    for _, og_row in own_goals_phase.iterrows():
                        og_team_name = og_row.get('team')
                        if og_team_name not in [home_team, away_team]:
                            continue
                        
                        loc = og_row.get('location')
                        if isinstance(loc, str):
                            try:
                                loc = json.loads(loc)
                            except:
                                try:
                                    loc = ast.literal_eval(loc)
                                except:
                                    continue
                        
                        if not isinstance(loc, (list, tuple)) or len(loc) < 2:
                            continue
                        
                        x, y = float(loc[0]), float(loc[1])
                        shot_map_data[og_team_name].append({
                            'x': x,
                            'y': y,
                            'color': 'purple',
                            'player': str(og_row.get('player', '')),
                            'event_type': 'own_goal'
                        })

                phase_metrics.append({
                    'phase_idx': ph['phase_idx'],
                    'start_minute': sm,
                    'start_second': ss,
                    'start_period': sp,
                    'end_minute': em,
                    'end_second': es,
                    'possession_pct_by_passes': possession_stats,
                    'box_entries': box_entries_dedup,
                    'box_entry_locations': box_entry_locations,
                    'final_third_entries': final_third_entries_dedup,
                    'fouls': fouls_per_team,
                    'cards': cards_per_team,
                    'chances': chances_per_team,
                    'shots_summary': shots_summary,
                    'penalties': penalties_per_team,
                    'goals': goals_per_team,
                    'score_at_start': score_start_counts,
                    'score_at_end': score_end_counts,
                    'shot_map_data': shot_map_data,
                })

        result = {
            'home_team': home_team,
            'away_team': away_team,
            'phases': phases,
            'phase_metrics': phase_metrics,
        }
        
        # Cache the result
        cache.set(cache_key, result, cache_type="game_phases")
        
        return JSONResponse(content=jsonable_encoder(result))
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"game_phases failed: {type(e).__name__}: {e}")

