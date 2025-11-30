"""
Important moments extraction module.

Extracts and returns key moments from a match (goals, high xG shots, penalty wins).
"""

import pandas as pd
import numpy as np
import math
import traceback
from fastapi import HTTPException


async def important_moments(filename: str):
    """
    Extract and return key moments from a match.
    
    Args:
        filename: S3 key of match events file
        
    Returns:
        list: Array of important moment dictionaries
        
    Raises:
        HTTPException: File processing errors
    """
    from cache import cache, s3
    
    cache_key = f"moments:{filename}:json"
    
    # Check cache first
    cached_result = cache.get(cache_key, cache_type="important_moments")
    if cached_result is not None:
        return cached_result
    
    try:
        # Load events with caching
        df_events = s3.get_dataframe(filename, cache_type="events_df")
        if df_events is None:
            # Fallback to local file if S3 fails
            try:
                df_events = pd.read_csv(filename)
            except Exception:
                raise HTTPException(status_code=404, detail=f"Could not load {filename}")
        shots = df_events[df_events["type"] == "Shot"].copy()
        if "shot_statsbomb_xg" in shots.columns:
            shots["xg"] = pd.to_numeric(shots["shot_statsbomb_xg"], errors="coerce")
        else:
            shots["xg"] = np.nan
        moments = pd.concat([
            shots[(shots["xg"] >= 0.08) | (shots.get('shot_outcome', '') == "Goal")],
            df_events[df_events['type'] == 'Own Goal Against'],
            df_events[df_events.get('foul_won_penalty', False) == True] if 'foul_won_penalty' in df_events.columns else pd.DataFrame()
        ], ignore_index=True).sort_values(by=['period', 'timestamp'])

        # ===== FILTER: Remove events after 120:00 =====
        if 'minute' in moments.columns and 'second' in moments.columns:
            # Keep events with minute < 120, or minute==120 and second <= 0
            mask = (moments['minute'] < 120) | ((moments['minute'] == 120) & (moments['second'] <= 0))
            moments = moments[mask].copy()

        # Replace all problematic values with None for JSON compatibility
        moments = moments.replace([np.nan, np.inf, -np.inf], None)
        moments = moments.where(pd.notnull(moments), None)
        result = []
        for idx, row in moments.iterrows():
            def safe(val):
                if val is None: return None
                if isinstance(val, float) and (math.isnan(val) or math.isinf(val)): return None
                return val
            player = row.get('player', '')
            if isinstance(player, str) and player.strip():
                parts = player.split()
                who = (f"{parts[0][0]}. {parts[-1]}" if len(parts) >=2 else parts[0])
            else:
                who = "N/A"
            shot_minute = safe(row.get('minute', None))
            shot_second = safe(row.get('second', None))
            if shot_minute is not None and shot_second is not None:
                when = f"{int(shot_minute)}:{int(shot_second):02d}"
            else:
                when = "N/A"
            xg_val = safe(row.get('xg', None))
            xg = round(float(xg_val), 3) if xg_val is not None else None
            event_type = safe(row.get('type', ""))
            outcome = safe(row.get('shot_outcome', None))
            if event_type == "Foul Won" and row.get('foul_won_penalty', False):
                outcome = "Penalty Won"
            possession = safe(row.get('possession'))
            team = safe(row.get('team', None))
            result.append({
                "original_row": int(idx),
                "possession": int(possession) if possession is not None else None,
                "who": who,
                "when": when,
                "event_type": event_type,
                "xg": xg,
                "outcome": outcome,
                "team": team
            })
        # NEW: Group by possession, only keep the last event from each (matches the robust notebook logic)
        if 'possession' in moments.columns:
            moments = moments.sort_values(
                ['possession', 'period', 'minute', 'second', 'timestamp'], 
                ascending=[True, True, True, True, True]
            )
            moments = moments.groupby('possession', as_index=False).last()
        # Remove FULLY duplicate rows after grouping to ensure no duplicate moments are returned
        moments = moments.drop_duplicates()
        
        # Cache the result
        cache.set(cache_key, result, cache_type="important_moments")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"important_moments failed: {type(e).__name__}: {e}")

