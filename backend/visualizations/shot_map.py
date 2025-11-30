"""
Shot map visualization module.

Generates interactive Plotly-based shot maps with xG values and match statistics.
"""

import pandas as pd
import numpy as np
import plotly.graph_objects as go
import json
import re
import traceback
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder

from utils.coords import _to_xy
from utils.pitch import make_pitch


async def get_match_viz(filename: str, team: str | None = None):
    """
    Generate an interactive shot map visualization for a match.
    
    Args:
        filename: S3 key of the match events file
        team: Optional team name filter
        
    Returns:
        JSONResponse with Plotly figure and metadata
        
    Raises:
        HTTPException: Various errors for missing data or processing failures
    """
    from cache import cache, s3
    
    # Build cache key including team filter
    cache_key = f"viz:{filename}:{team or 'all'}:plotly"
    
    # Check cache first
    cached_result = cache.get(cache_key, cache_type="plotly_viz")
    if cached_result is not None:
        safe_cached = jsonable_encoder(
            cached_result,
            custom_encoder={
                pd.Timestamp: lambda v: v.isoformat(),
                np.integer: int,
                np.floating: float,
                np.bool_: bool,
            }
        )
        return JSONResponse(content=safe_cached)

    try:
        # --- fetch CSV (404 if not found) - use async with caching
        df = s3.get_dataframe(filename, cache_type="events_df")
        if df is None:
            raise HTTPException(status_code=404, detail=f"S3 key not found: {filename}")

        # --- minimum columns
        for col in ("type", "location"):
            if col not in df.columns:
                raise HTTPException(status_code=400, detail=f"Missing required column '{col}'")

        # --- shots + coordinates
        shots = df[df["type"] == "Shot"].copy()
        if shots.empty:
            raise HTTPException(status_code=404, detail="No shot events found in this file")

        shots[["sx", "sy"]] = shots["location"].apply(_to_xy).to_list()

        # xG column may be absent or all NaN
        if "shot_statsbomb_xg" in shots.columns:
            shots["xg"] = pd.to_numeric(shots["shot_statsbomb_xg"], errors="coerce")
        else:
            shots["xg"] = np.nan

        # outcome may be absent
        outcome = shots["shot_outcome"].astype(str).str.lower() if "shot_outcome" in shots.columns else pd.Series("", index=shots.index)
        is_goal = outcome.eq("goal")

        # --- optional scoreboard stats (best-effort; never crash)
        meta = {
            "home_team": None, "away_team": None,
            "home_score": None, "away_score": None,
            "competition_stage": None,
            "home_shots": None, "away_shots": None,
            "home_shots_on_target": None, "away_shots_on_target": None,
            "home_xg_sum": None, "away_xg_sum": None,
            'home_fouls': None, 'away_fouls': None,
            'home_cards_yellow': None, 'away_cards_yellow': None,
            'home_cards_red': None, 'away_cards_red': None,
            'home_cards_total': None, 'away_cards_total': None,
            'home_big_chances': None, 'away_big_chances': None,
            'home_ok_chances': None, 'away_ok_chances': None,
        }
        try:
            # try matches_df lookup (use cached version)
            mdf = s3.get_dataframe("matches_df.csv", cache_type="matches_df")

            # match_id from filename
            m = re.search(r"\d+", filename or "")
            match_id = int(m.group()) if m else None
            
            if mdf is not None and match_id is not None and "match_id" in mdf.columns:
                row = mdf.loc[mdf["match_id"] == match_id]
                if not row.empty:
                    r = row.iloc[0]
                    meta["home_team"] = r.get("home_team")
                    meta["away_team"] = r.get("away_team")
                    meta["home_score"] = int(r.get("home_score")) if pd.notna(r.get("home_score")) else None
                    meta["away_score"] = int(r.get("away_score")) if pd.notna(r.get("away_score")) else None
                    meta["competition_stage"] = r.get("competition_stage")

            # compute team shot counts/xG if possible (use cached events_df)
            if match_id is not None and mdf is not None and meta["home_team"] and meta["away_team"]:
                ev_key = f"events_{match_id}.csv"
                ev = s3.get_dataframe(ev_key, cache_type="events_df")
                if ev is None:
                    ev = pd.DataFrame()  # Fallback to empty DataFrame
                if {"type", "team"} <= set(ev.columns):
                    shot_df = ev[ev["type"] == "Shot"].copy()
                    # on target mask
                    sot = shot_df["shot_outcome"].astype(str).str.lower().str.contains("saved|goal") if "shot_outcome" in shot_df.columns else pd.Series(False, index=shot_df.index)
                    # counts
                    for side in ("home", "away"):
                        t = meta[f"{side}_team"]
                        if t:
                            total_xg_val = 0.0
                            penalty_xg_val = 0.0
                            filtered = shot_df.copy()
                            if 'minute' in shot_df.columns and 'second' in shot_df.columns:
                                filtered = shot_df[(shot_df['minute'] < 120) | ((shot_df['minute'] == 120) & (shot_df['second'] <= 0))].copy()
                            else:
                                0==0
                            if 'shot_statsbomb_xg' in filtered.columns:
                                xg_ser = pd.to_numeric(filtered.loc[filtered["team"] == t, "shot_statsbomb_xg"], errors="coerce")
                                total_xg_val = float(xg_ser.sum()) if not xg_ser.empty else 0.0
                         
                                if 'shot_type' in filtered.columns:
                                    penalty_mask = (filtered["team"] == t) & (filtered["shot_type"].astype(str).str.lower() == 'penalty')
                                    penalty_xg_ser = pd.to_numeric(filtered.loc[penalty_mask, "shot_statsbomb_xg"], errors="coerce")
                                    penalty_xg_val = float(penalty_xg_ser.sum()) if not penalty_xg_ser.empty else 0.0
                                 
                            else:
                                0==0
                            meta[f"{side}_xg_sum"] = f"{total_xg_val:.2f} ({penalty_xg_val:.2f})"

                            # SHOTS and SHOTS ON TARGET COUNTS
                            shots_mask = (filtered["team"] == t)
                            shots_on_target_mask = shots_mask & (sot if isinstance(sot, pd.Series) else False)
                            shots_count = int(shots_mask.sum())
                            shots_on_target_count = int(shots_on_target_mask.sum())
                            meta[f"{side}_shots"] = shots_count
                            meta[f"{side}_shots_on_target"] = shots_on_target_count

                    # === Additional scoreboard metrics ===
                    ev_filtered = ev.copy()
                    if 'minute' in ev_filtered.columns and 'second' in ev_filtered.columns:
                        ev_filtered['minute_int'] = pd.to_numeric(ev_filtered['minute'], errors='coerce').fillna(0).astype(int)
                        ev_filtered['second_int'] = pd.to_numeric(ev_filtered['second'], errors='coerce').fillna(0).astype(int)
                        ev_filtered = ev_filtered[(ev_filtered['minute_int'] < 120) | ((ev_filtered['minute_int'] == 120) & (ev_filtered['second_int'] <= 0))]

                    # Big chances (xg >= 0.27) and OK chances (0.08 <= xg < 0.27)
                    if 'shot_statsbomb_xg' in ev_filtered.columns:
                        ev_filtered['xg'] = pd.to_numeric(ev_filtered['shot_statsbomb_xg'], errors='coerce')
                    else:
                        ev_filtered['xg'] = np.nan
                    is_shot = ev_filtered['type'] == 'Shot'
                    big_mask = is_shot & (ev_filtered['xg'] >= 0.27)
                    ok_mask = is_shot & (ev_filtered['xg'] >= 0.08) & (ev_filtered['xg'] < 0.27)
                    if 'team' in ev_filtered.columns:
                        big_counts = ev_filtered.loc[big_mask].groupby('team').size()
                        ok_counts = ev_filtered.loc[ok_mask].groupby('team').size()
                        meta['home_big_chances'] = int(big_counts.get(meta['home_team'], 0))
                        meta['away_big_chances'] = int(big_counts.get(meta['away_team'], 0))
                        meta['home_ok_chances'] = int(ok_counts.get(meta['home_team'], 0))
                        meta['away_ok_chances'] = int(ok_counts.get(meta['away_team'], 0))
                    else:
                        meta['home_big_chances'] = meta['away_big_chances'] = 0
                        meta['home_ok_chances'] = meta['away_ok_chances'] = 0

                    # Fouls committed
                    fouls_df = ev_filtered[ev_filtered['type'] == 'Foul Committed'] if 'type' in ev_filtered.columns else pd.DataFrame()
                    if not fouls_df.empty and 'team' in fouls_df.columns:
                        f_counts = fouls_df.groupby('team').size()
                        meta['home_fouls'] = int(f_counts.get(meta['home_team'], 0))
                        meta['away_fouls'] = int(f_counts.get(meta['away_team'], 0))
                    else:
                        meta['home_fouls'] = meta['away_fouls'] = 0

                    # Cards (from fouls): total, yellow, red
                    if not fouls_df.empty and 'foul_committed_card' in fouls_df.columns and 'team' in fouls_df.columns:
                        yellow_df = fouls_df[fouls_df['foul_committed_card'] == 'Yellow Card']
                        red_df = fouls_df[fouls_df['foul_committed_card'] == 'Red Card']
                        y_counts = yellow_df.groupby('team').size()
                        r_counts = red_df.groupby('team').size()
                        meta['home_cards_yellow'] = int(y_counts.get(meta['home_team'], 0))
                        meta['away_cards_yellow'] = int(y_counts.get(meta['away_team'], 0))
                        meta['home_cards_red'] = int(r_counts.get(meta['home_team'], 0))
                        meta['away_cards_red'] = int(r_counts.get(meta['away_team'], 0))
                        meta['home_cards_total'] = meta['home_cards_yellow'] + meta['home_cards_red']
                        meta['away_cards_total'] = meta['away_cards_yellow'] + meta['away_cards_red']
                    else:
                        meta['home_cards_yellow'] = meta['away_cards_yellow'] = 0
                        meta['home_cards_red'] = meta['away_cards_red'] = 0
                        meta['home_cards_total'] = meta['away_cards_total'] = 0

                    # Opposition box entries across whole match (dedup by possession)
                    try:
                        home_team_name = meta.get('home_team')
                        away_team_name = meta.get('away_team')
                        if home_team_name and away_team_name:
                            # Define right-side penalty box rectangle
                            def _point_in_box(pt):
                                if not isinstance(pt, (list, tuple)) or len(pt) < 2:
                                    return False
                                x, y = float(pt[0]), float(pt[1])
                                return (102 <= x <= 120) and (18 <= y <= 62)

                            # Carries
                            carries = ev_filtered[ev_filtered['type'] == 'Carry'].copy() if 'type' in ev_filtered.columns else pd.DataFrame()
                            if not carries.empty and 'carry_end_location' in carries.columns:
                                carries[['ex', 'ey']] = carries['carry_end_location'].apply(_to_xy).to_list()
                                carries['in_box'] = carries.apply(lambda r: _point_in_box([r['ex'], r['ey']]) if pd.notna(r['ex']) and pd.notna(r['ey']) else False, axis=1)
                            else:
                                carries['in_box'] = []

                            # Completed passes
                            if 'type' in ev_filtered.columns:
                                pass_mask = (ev_filtered['type'] == 'Pass') & (ev_filtered.get('pass_outcome').isna() if 'pass_outcome' in ev_filtered.columns else True)
                                passes = ev_filtered[pass_mask].copy()
                            else:
                                passes = pd.DataFrame()
                            if not passes.empty and 'pass_end_location' in passes.columns:
                                passes[['px', 'py']] = passes['pass_end_location'].apply(_to_xy).to_list()
                                passes['in_box'] = passes.apply(lambda r: _point_in_box([r['px'], r['py']]) if pd.notna(r['px']) and pd.notna(r['py']) else False, axis=1)
                            else:
                                passes['in_box'] = []

                            # Deduplicate by possession across carries and passes
                            home_poss, away_poss = set(), set()
                            if not carries.empty and {'team', 'possession', 'in_box'} <= set(carries.columns):
                                for _, r in carries[carries['in_box'] & carries['team'].notna()].iterrows():
                                    try:
                                        if r['team'] == home_team_name:
                                            home_poss.add(int(r['possession']))
                                        elif r['team'] == away_team_name:
                                            away_poss.add(int(r['possession']))
                                    except Exception:
                                        continue
                            if not passes.empty and {'team', 'possession', 'in_box'} <= set(passes.columns):
                                for _, r in passes[passes['in_box'] & passes['team'].notna()].iterrows():
                                    try:
                                        if r['team'] == home_team_name:
                                            home_poss.add(int(r['possession']))
                                        elif r['team'] == away_team_name:
                                            away_poss.add(int(r['possession']))
                                    except Exception:
                                        continue

                            meta['home_box_entries'] = int(len(home_poss))
                            meta['away_box_entries'] = int(len(away_poss))
                        else:
                            meta['home_box_entries'] = meta['away_box_entries'] = None
                    except Exception as _e_box:
                        meta['home_box_entries'] = meta['away_box_entries'] = None
        except Exception as e2:
            0==0

        # Now meta is always defined, so if team (and possibly away flip) logic can safely use it
        if team:
            if "team" not in shots.columns:
                raise HTTPException(status_code=400, detail="Missing 'team' column required for team filter")
            sub = shots.loc[shots["team"] == team].copy()
            if sub.empty:
                raise HTTPException(status_code=404, detail=f"No shots found for team '{team}'")
            # --- Flip X/Y for away team
            pitch_length = 120
            pitch_width = 80
            away_team = meta.get("away_team")
            if away_team and team == away_team:
                sub["sx"] = pitch_length - sub["sx"]
                sub["sy"] = pitch_width - sub["sy"]
        else:
            sub = shots

        # color scale bounds & marker sizes (avoid NaN issues)
        xg_vals = sub["xg"].fillna(0.0)
        xg_max = float(xg_vals.max() if pd.notna(xg_vals.max()) else 0.01)
        xg_max = max(0.01, xg_max)

        def _size(series):
            return (10 + 60 * series.fillna(0)).clip(lower=6, upper=40)

        # --- figure
        fig = go.Figure()
        fig.add_trace(go.Scatter(
            x=sub["sx"], y=sub["sy"],
            mode="markers",
            marker=dict(
                size=_size(sub["xg"]),
                color=xg_vals,
                colorscale="Reds",
                cmin=0, cmax=xg_max,
                showscale=True,
                colorbar=dict(title="xG"),
                line=dict(width=0),
            ),
            text=[
                f"<b>{str(row.get('player',''))}</b><br>"
                f"Minute: {str(row.get('minute',''))}<br>"
                f"Second: {str(row.get('second',''))}<br>"
                f"xG: {float((row.get('xg') if pd.notna(row.get('xg')) else 0)):.3f}<br>"
                f"Outcome: {str(row.get('shot_outcome',''))}"
                for _, row in sub.iterrows()
            ],
            hoverinfo="text",
            name="Shot"
        ))

        # highlight goals if any
        sub_goal_mask = outcome.loc[sub.index].eq("goal")
        if sub_goal_mask.any():
            fig.add_trace(go.Scatter(
                x=sub.loc[sub_goal_mask, "sx"], y=sub.loc[sub_goal_mask, "sy"],
                mode="markers",
                marker=dict(
                    size=_size(sub.loc[sub_goal_mask, "xg"]),
                    color=sub.loc[sub_goal_mask, "xg"].fillna(0.0),
                    colorscale="Reds",
                    cmin=0, cmax=xg_max,
                    showscale=False,
                    line=dict(width=3, color="black"),
                ),
                hoverinfo="skip",
                name="Goal"
            ))

        fig = make_pitch(fig)
        # identify teams for title if not filtered
        if not team and "team" in shots.columns:
            teams = shots["team"].dropna().astype(str).unique().tolist()
            if len(teams) < 2:
                teams = teams + ["Opponent"]
            title_txt = f"{teams[0]} vs {teams[1]}"
        else:
            title_txt = team or "Match"

        fig.update_layout(
            title=f"Shot Map — {title_txt}",
            xaxis=dict(showgrid=False, visible=False, range=[0, 120]),
            yaxis=dict(showgrid=False, visible=False, range=[0, 80]),
            plot_bgcolor="white", height=600, width=900
        )
        fig.update_yaxes(autorange="reversed")

        # combine payload
        import plotly.utils as pu

        # Convert plotly Figure → JSON-safe dict
        plotly_json = json.loads(json.dumps(fig, cls=pu.PlotlyJSONEncoder))

        # Merge plot + metadata
        payload = {**plotly_json, **meta}
        
        # Cache the result
        cache.set(cache_key, payload, cache_type="plotly_viz")
        
        # Make payload fully JSON-safe (handles numpy, pandas, plotly objects)
        safe_payload = jsonable_encoder(
            payload,
            custom_encoder={
                pd.Timestamp: lambda v: v.isoformat(),
                np.integer: int,
                np.floating: float,
                np.bool_: bool,
            }
        )

        return JSONResponse(content=safe_payload)

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"/viz failed: {type(e).__name__}: {e}")

