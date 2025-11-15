from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Response, Request
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import boto3
import plotly.express as px
import json
import os
import io
import numpy as np
import plotly.graph_objects as go
from fastapi.responses import JSONResponse
import traceback
import re
import base64
# Set matplotlib backend to Agg (non-GUI) to prevent threading issues on macOS
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from fastapi.encoders import jsonable_encoder
import math
import asyncio
import logging

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # python-dotenv not installed, try to load .env manually
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()


# API versioning and metadata configuration
API_VERSION = "v1"
API_TITLE = "Columbia MSDS Soccer Analytics API"
API_DESCRIPTION = """
## Soccer Analytics API for Euro 2020 Match Data

This API provides comprehensive soccer analytics endpoints for match visualization,
player tracking, and tactical analysis using StatsBomb event data.

### Features

* **Match Data**: Access event-level data for Euro 2020 matches
* **Visualizations**: Shot maps, passing networks, possession scenes
* **Analytics**: Game phases, important moments, tactical insights
* **Interactive**: Plotly-based visualizations for web integration

### Data Format

All match data uses StatsBomb's coordinate system (120×80 pitch dimensions).

### Authentication

Currently no authentication required. AWS credentials are handled server-side.

### Rate Limiting

No rate limits currently enforced.

### Support

For issues or questions, contact the development team.
"""

app = FastAPI(
    title=API_TITLE,
    description=API_DESCRIPTION,
    version=API_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    contact={
        "name": "Columbia MSDS F25 Soccer Team",
        "email": "support@example.com",
    },
    license_info={
        "name": "MIT",
    },
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    """Warm up cache on startup by pre-loading common data"""
    try:
        from cache import cache, async_s3
        
        logger.info("🔥 Starting cache warmup...")
        
        # Warm up matches_df.csv (most frequently accessed)
        try:
            matches_df = await async_s3.get_dataframe("matches_df.csv", cache_type="matches_df")
            if matches_df is not None:
                logger.info("✅ Cache warmed: matches_df.csv")
        except Exception as e:
            logger.warning(f"⚠️ Cache warmup failed for matches_df.csv: {e}")
        
        logger.info("✅ Cache warmup complete")
    except Exception as e:
        logger.warning(f"⚠️ Cache warmup error: {e}")

TEAM_COLORS = {
    "Albania": "#E41F26",
    "Andorra": "#0033A0",
    "Armenia": "#D90012",
    "Austria": "#ED2939",
    "Azerbaijan": "#007FFF",
    "Belarus": "#E31A1C",
    "Belgium": "#FF0000",
    "Bosnia and Herzegovina": "#0066CC",
    "Bulgaria": "#FFD700",
    "Croatia": "#0057B8",
    "Cyprus": "#006A4E",
    "Czech Republic": "#0039A6",
    "Denmark": "#C60C30",
    "England": "#CF142B",
    "Estonia": "#0072CE",
    "Finland": "#003580",
    "France": "#1F14DE",
    "Germany": "#000000",
    "Greece": "#0000FF",
    "Hungary": "#CE1126",
    "Iceland": "#003897",
    "Ireland": "#009A49",
    "Italy": "#007FFF",
    "Netherlands": "#FF6600",
    "Poland": "#0057B8",
    "Portugal": "#006600",
    "Romania": "#0033A0",
    "Russia": "#0057B8",
    "Scotland": "#0033A0",
    "Spain": "#C60B1E",
    "Sweden": "#FFEC00",
    "Switzerland": "#FF0000",
    "Turkey": "#E30A17",
    "Ukraine": "#FFE000",
    "Wales": "#D80000",
}

def make_pitch(fig, linecolor="black", lw=2):
    """Add soccer pitch with goal mouths and posts."""
    pitch_shapes = [
        # Outline
        dict(type="rect", x0=0, y0=0, x1=120, y1=80, line=dict(color=linecolor, width=lw)),
        # Halfway line
        dict(type="line", x0=60, y0=0, x1=60, y1=80, line=dict(color=linecolor, width=lw)),
        # Penalty boxes
        dict(type="rect", x0=0, y0=18, x1=18, y1=62, line=dict(color=linecolor, width=lw)),
        dict(type="rect", x0=102, y0=18, x1=120, y1=62, line=dict(color=linecolor, width=lw)),
        # Six-yard boxes
        dict(type="rect", x0=0, y0=30, x1=6, y1=50, line=dict(color=linecolor, width=lw)),
        dict(type="rect", x0=114, y0=30, x1=120, y1=50, line=dict(color=linecolor, width=lw)),
        # Goals (extend beyond pitch)
        dict(type="rect", x0=-2, y0=36, x1=0, y1=44, line=dict(color="black", width=3)),
        dict(type="rect", x0=120, y0=36, x1=122, y1=44, line=dict(color="black", width=3)),
        # Center circle
        dict(type="circle", x0=50, y0=30, x1=70, y1=50, line=dict(color=linecolor, width=lw)),
        # Penalty spots
        dict(type="circle", x0=11, y0=39, x1=13, y1=41, line=dict(color=linecolor, width=lw)),
        dict(type="circle", x0=107, y0=39, x1=109, y1=41, line=dict(color=linecolor, width=lw)),
    ]
    fig.update_layout(shapes=pitch_shapes)
    return fig



# Allow React frontend (port 3000 or 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://columbia-msds-f25-soccer.onrender.com", 
        "http://localhost:3000", 
        "https://columbia-msds-f25-soccer-frontend.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AWS_REGION = os.getenv("AWS_REGION", "us-east-2")
S3_BUCKET = os.getenv("S3_BUCKET_NAME", "capstone-soccer-data")

s3_client = boto3.client(
    's3',
    region_name=AWS_REGION,
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
)

@app.post("/api/client-error", tags=["System"], summary="Log client-side errors")
async def client_error_log(request: Request):
    """
    Receive and log client-side error reports from the frontend ErrorBoundary.
    
    This endpoint captures JavaScript errors that occur in the browser and logs them
    to the server console for debugging and monitoring purposes.
    
    **Request Body Example:**
    ```json
    {
        "message": "Cannot read property 'x' of undefined",
        "stack": "Error: Cannot read property 'x' of undefined\\n    at Component...",
        "componentStack": "    in ErrorComponent\\n    in App",
        "url": "https://example.com/match/123",
        "userAgent": "Mozilla/5.0...",
        "time": "2024-01-15T10:30:00.000Z"
    }
    ```
    
    **Response:**
    ```json
    {
        "status": "ok"
    }
    ```
    
    **Args:**
        request: FastAPI Request object containing error payload
        
    **Returns:**
        dict: Status acknowledgment
        
    **Notes:**
        - Errors are logged to stdout (captured by hosting provider)
        - Maximum 10,000 characters logged per error
        - Non-JSON payloads are handled gracefully
    """
    try:
        payload = await request.json()
    except Exception:
        payload = {"error": "failed to parse client error payload"}
    try:
        # Log to stdout (captured by hosting provider logs)
        print("🔴 Client Error Report:", json.dumps(payload)[:10000])
    except Exception:
        print("🔴 Client Error Report (unserializable payload)")
    return {"status": "ok"}


@app.post("/api/cache/clear", tags=["System"], summary="Clear all cache entries")
def clear_cache():
    """
    Clear all entries from the cache and reset metrics.
    
    **Use Cases:**
    - Testing performance without cache
    - Forcing fresh data fetch
    - Debugging cache issues
    
    **Returns:**
        dict: Confirmation message and stats
    """
    from cache import cache
    cache.clear()
    return {"message": "Cache cleared successfully", "stats": cache.get_stats()}


@app.get("/api/cache/stats", tags=["System"], summary="Get cache statistics")
def cache_stats():
    """
    Get cache statistics including hit/miss rates and cache size.
    
    **Response Example:**
    ```json
    {
        "backend": "memory",
        "hits": 45,
        "misses": 12,
        "total": 57,
        "hit_rate": 78.95,
        "size": 23,
        "maxsize": 1000,
        "ttl_default": 600
    }
    ```
    
    **Returns:**
        dict: Cache statistics
    """
    from cache import cache
    return cache.get_stats()


@app.get('/api/matches', tags=["Matches"], summary="List all available matches")
async def list_matches():
    """
    Retrieve a list of all available match data files from S3 storage.
    
    Returns formatted match information including event files and 360 freeze-frame data
    with human-readable labels (date, teams, data type).
    
    **Response Example:**
    ```json
    [
        {
            "file": "events_3788741.csv",
            "label": "2021-07-11 - Italy vs England – Events"
        },
        {
            "file": "frames_360_3788741.csv",
            "label": "2021-07-11 - Italy vs England – Frames 360"
        }
    ]
    ```
    
    **Returns:**
        list[dict]: Array of match files with metadata
        - file (str): S3 key/filename
        - label (str): Human-readable match description
        
    **Raises:**
        HTTPException 500: If S3 access fails or matches_df.csv is unavailable
        
    **Notes:**
        - Results are sorted by date (most recent first)
        - Only CSV files are included
        - Requires AWS credentials configured server-side
        - Match labels are generated from matches_df.csv metadata
        - Results are cached for 15 minutes
    """
    from cache import cache, async_s3
    
    cache_key = "api:matches:list"
    
    # Check cache first
    cached_result = cache.get(cache_key, cache_type="matches_list")
    if cached_result is not None:
        return cached_result
    
    try:
        # Cache miss - fetch from S3
        # 1️⃣ Get all CSV files in S3 bucket (including subfolders)
        files = await async_s3.list_objects(prefix='')
        files = [f for f in files if f.endswith('.csv')]

        # 2️⃣ Load matches_df.csv from S3 (with caching)
        matches_df = await async_s3.get_dataframe("matches_df.csv", cache_type="matches_df")
        if matches_df is None:
            raise HTTPException(status_code=500, detail="Failed to load matches_df.csv")

        # 3️⃣ Build a lookup: match_id → "YYYY-MM-DD - Home vs Away"
        label_lookup = {
            str(row['match_id']): f"{row['match_date']} - {row['home_team']} vs {row['away_team']}"
            for _, row in matches_df.iterrows()
        }

        # 4️⃣ Map files to readable labels
        formatted = []
        for f in files:
            match_id = ''.join([c for c in f if c.isdigit()])
            if not match_id:
                continue

            # Use readable label if available, otherwise fall back to generic
            label = label_lookup.get(match_id, f"Match {match_id}")

            if f.startswith("events_"):
                tag = "Events"
            elif f.startswith("frames_360_"):
                tag = "Frames 360"
            else:
                tag = "Other"

            formatted.append({
                "file": f,
                "label": f"{label} – {tag}"
            })

        # 5️⃣ Sort matches by date descending (for better UX)
        formatted = sorted(formatted, key=lambda x: x['label'], reverse=True)

        result = jsonable_encoder(formatted)
        
        # Cache the result
        cache.set(cache_key, result, cache_type="matches_list")
        
        return result

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/api/upload", tags=["Data Upload"], summary="Upload and visualize CSV data")
async def upload_csv(file: UploadFile = File(...)):
    """
    Upload a CSV file and receive an automated Plotly visualization.
    
    This endpoint accepts CSV files and generates appropriate visualizations based on
    the detected columns. Useful for quick data exploration.
    
    **Parameters:**
        - **file** (UploadFile): CSV file to upload
        
    **Response Example:**
    ```json
    {
        "data": [...],
        "layout": {
            "title": {"text": "Uploaded CSV Visualization"},
            ...
        }
    }
    ```
    
    **Returns:**
        dict: Plotly figure object (JSON format) ready for rendering
        
    **Behavior:**
        - If CSV has 'x' and 'y' columns: creates scatter plot
        - Otherwise: creates bar chart preview of first rows
        - Returns Plotly figure as JSON dictionary
        
    **Error Response:**
    ```json
    {
        "error": "Error message describing the issue"
    }
    ```
    
    **Notes:**
        - Maximum file size depends on server configuration
        - Supports standard CSV format with header row
        - Non-blocking upload processing
    """
    try:
        # Read CSV into pandas
        df = pd.read_csv(file.file)

        # Example visualization: scatter plot
        # (You can modify based on your CSV columns)
        if "x" in df.columns and "y" in df.columns:
            fig = px.scatter(
                df, x="x", y="y", color=df.columns[2] if len(df.columns) > 2 else None,
                title="Uploaded CSV Visualization"
            )
        else:
            # If the file doesn't have x/y, just show basic summary
            fig = px.bar(df.head(), title="Preview of Uploaded Data")

        # Convert to Plotly JSON for React
        return fig.to_dict()

    except Exception as e:
        return {"error": str(e)}

def _to_xy(val):
    try:
        arr = json.loads(val) if isinstance(val, str) else val
        if isinstance(arr, (list, tuple)) and len(arr) >= 2:
            return float(arr[0]), float(arr[1])
    except Exception:
        pass
    return (np.nan, np.nan)

@app.get("/api/match/{filename}/viz", tags=["Match Visualizations"], summary="Generate shot map visualization")
async def get_match_viz(filename: str, team: str | None = Query(default=None, description="Filter by specific team name")):
    """
    Generate an interactive shot map visualization for a match.
    
    Creates a Plotly-based shot map showing all shots with xG values, outcomes (goals vs misses),
    and optional team filtering. Includes scoreboard statistics and pitch overlay.
    
    **Path Parameters:**
        - **filename** (str): S3 key of the match events file (e.g., "events_3788741.csv")
        
    **Query Parameters:**
        - **team** (str, optional): Filter shots for a specific team
        
    **Response Example:**
    ```json
    {
        "data": [...],
        "layout": {
            "title": {"text": "Italy 1-1 England (3-2 pens) | Shots: 20 (6 on target)"},
            "shapes": [...],
            ...
        }
    }
    ```
    
    **Returns:**
        dict: Plotly figure with shot locations, xG sizes, and pitch markings
        
    **Raises:**
        - HTTPException 404: File not found in S3 or no shots in match
        - HTTPException 400: Missing required columns (type, location)
        
    **Features:**
        - StatsBomb 120×80 pitch coordinates
        - Shot markers sized by xG value
        - Goals vs non-goals color-coded
        - Scoreboard with score, shots, shots on target
        - Team-specific filtering available
        - Graceful handling of missing xG data
        
    **Notes:**
        - Requires valid events CSV with 'type' and 'location' columns
        - xG column (shot_statsbomb_xg) is optional
        - Team colors auto-assigned from predefined palette
        - Results are cached for 10 minutes
    """
    from cache import cache, async_s3
    
    # Build cache key including team filter
    cache_key = f"viz:{filename}:{team or 'all'}:plotly"
    
    # Check cache first
    cached_result = cache.get(cache_key, cache_type="plotly_viz")
    if cached_result is not None:
        return JSONResponse(content=jsonable_encoder(cached_result))
    
    try:
        # --- fetch CSV (404 if not found) - use async with caching
        df = await async_s3.get_dataframe(filename, cache_type="events_df")
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
            mdf = await async_s3.get_dataframe("matches_df.csv", cache_type="matches_df")

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
                ev = await async_s3.get_dataframe(ev_key, cache_type="events_df")
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
                    # Use same logic as phase metrics: carries ending in box + completed passes ending in box
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
        payload = fig.to_dict()
        payload.update(meta)
        
        # Cache the result
        cache.set(cache_key, payload, cache_type="plotly_viz")
        
        return JSONResponse(content=jsonable_encoder(payload))

    except HTTPException:
        raise
    except Exception as e:
        # print full stack for quick debugging
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"/viz failed: {type(e).__name__}: {e}")
    

@app.get("/api/match/{filename}/passing_network", tags=["Match Visualizations"], summary="Generate passing network visualization")
async def passing_network_like_matplotlib(
    filename: str,
    team: str = Query(..., description="Team name to generate passing network for"),
    min_passes: int = Query(1, ge=1, description="Minimum passes between players to display"),
    flip: bool = Query(False, description="Flip the pitch orientation horizontally"),
):
    """
    Generate an interactive passing network visualization for a team.
    
    Creates a network graph showing passing connections between players with nodes
    representing average player positions and edges weighted by pass frequency.
    Automatically filters to Starting XI if lineup data is available.
    
    **Path Parameters:**
        - **filename** (str): S3 key of match events file (e.g., "events_3788741.csv")
        
    **Query Parameters:**
        - **team** (str, required): Team name for which to generate network
        - **min_passes** (int, optional): Minimum passes between two players to show edge (default: 1)
        - **flip** (bool, optional): Flip pitch horizontally (default: false)
        
    **Response Example:**
    ```json
    {
        "data": [...],
        "layout": {
            "title": {"text": "Italy Passing Network - Starting XI"},
            "shapes": [...],
            ...
        }
    }
    ```
    
    **Returns:**
        dict: Plotly figure with player nodes and passing edges
        
    **Raises:**
        - HTTPException 400: Missing required columns or invalid team name
        - HTTPException 404: Match file not found in S3
        - HTTPException 500: Processing error
        
    **Features:**
        - Starting XI detection from lineup data
        - Node positions = average player location during match
        - Edge thickness = number of passes between players
        - Player names displayed at node positions
        - StatsBomb 120×80 pitch overlay
        - Optional horizontal flip for team orientation
        
    **Notes:**
        - Requires 'location', 'pass_end_location', 'type', 'team' columns
        - Falls back to all players if lineup data unavailable
        - Pass recipient detection uses nearest-player heuristic
    """
    from cache import cache, async_s3
    
    # Build cache key including all parameters
    cache_key = f"passnet:{filename}:{team}:{min_passes}:{flip}:plotly"
    
    # Check cache first
    cached_result = cache.get(cache_key, cache_type="passing_network")
    if cached_result is not None:
        return JSONResponse(content=jsonable_encoder(cached_result))
    
    try:
        # -------- Load events CSV with caching --------
        events = await async_s3.get_dataframe(filename, cache_type="events_df")
        if events is None:
            raise HTTPException(status_code=404, detail=f"S3 key not found: {filename}")
        cols = set(events.columns)

        # Minimum required geometry columns
        required_geom = {"location", "pass_end_location"}
        missing_geom = required_geom - cols
        if missing_geom:
            raise HTTPException(status_code=400, detail=f"Missing columns: {', '.join(sorted(missing_geom))}")

        if "type" not in cols or "team" not in cols:
            raise HTTPException(status_code=400, detail="Missing required columns 'type' and/or 'team'")

        # -------- Derive match_id from filename to locate lineups file(s) --------
        m = re.search(r"\d+", filename or "")
        match_id = m.group() if m else None

        # -------- Helper to parse 'positions' cells (list/dict/string/NaN) --------
        import json as _json
        import ast as _ast

        def _parse_positions_cell(x):
            if isinstance(x, list):
                return x
            if isinstance(x, dict):
                return [x]
            if x is None or (isinstance(x, float) and pd.isna(x)):
                return []
            if isinstance(x, str):
                s = x.strip()
                if not s:
                    return []
                # Try JSON first
                try:
                    v = _json.loads(s)
                    return v if isinstance(v, list) else [v]
                except Exception:
                    pass
                # Try Python literal (handles single quotes)
                try:
                    v = _ast.literal_eval(s)
                    return v if isinstance(v, list) else [v]
                except Exception:
                    # JSON-ish fallback
                    s2 = s.replace("null", "None").replace("true", "True").replace("false", "False")
                    try:
                        v = _ast.literal_eval(s2)
                        return v if isinstance(v, list) else [v]
                    except Exception:
                        return []
            return []

        # -------- Load lineups (best-effort) & build Starting XI whitelist --------
        starting_ids, starting_names = set(), set()

        async def _try_load_lineups():
            candidates = []
            if match_id:
                candidates += [
                    f"lineups_{match_id}.csv",
                    f"lineups{match_id}.csv",
                    f"{match_id}_lineups.csv",
                ]
            candidates += ["lineups.csv", "match_lineups.csv"]

            for key in candidates:
                try:
                    df = await async_s3.get_dataframe(key, cache_type="events_df")
                    if df is not None:
                        return df
                except Exception:
                    continue
            return None

        lineups_df = await _try_load_lineups()

        if lineups_df is not None and "positions" in lineups_df.columns:
            lu = lineups_df.copy()
            lu["positions_parsed"] = lu["positions"].apply(_parse_positions_cell)
            mask_start = lu["positions_parsed"].apply(
                lambda lst: any(isinstance(d, dict) and d.get("start_reason") == "Starting XI" for d in lst)
            )
            starters = lu[mask_start].copy()

            # Prefer player_id if present, else fallback to player names
            if "player_id" in starters.columns:
                with pd.option_context("mode.chained_assignment", None):
                    pid_series = pd.to_numeric(starters["player_id"], errors="coerce")
                starting_ids = set(pid_series.dropna().astype(int).tolist())
                # If player_id are not numeric (rare), keep raw values too
                if not starting_ids and starters["player_id"].notna().any():
                    starting_ids = set(starters["player_id"].astype(str).tolist())
            if "player" in starters.columns:
                starting_names = set(starters["player"].astype(str).tolist())

        # -------- Build events working frame & player ids/names --------
        df = events.copy()

        # Source/destination ids
        if "player_id" in cols:
            df["src_id"] = df["player_id"]
        else:
            df["src_name"] = df.get("player", "").astype(str)

        if "pass_recipient_id" in cols:
            df["dst_id"] = df["pass_recipient_id"]
        else:
            df["dst_name"] = df.get("pass_recipient", "").astype(str)

        # If ids missing, synthesize consistent ids from names
        if "src_id" not in df.columns or "dst_id" not in df.columns:
            src_names = df.get("src_name", pd.Series([], dtype=str)).astype(str)
            dst_names = df.get("dst_name", pd.Series([], dtype=str)).astype(str)
            all_names = pd.Index(src_names).append(pd.Index(dst_names)).astype(str).unique()
            name_to_id = {n: i for i, n in enumerate(all_names)}
            if "src_id" not in df.columns:
                df["src_id"] = src_names.map(name_to_id)
            if "dst_id" not in df.columns:
                df["dst_id"] = dst_names.map(name_to_id)

        # Map id -> display name
        id_to_name = {}
        if "player" in df.columns:
            id_to_name.update(
                df.loc[df["team"] == team, ["src_id", "player"]]
                  .dropna()
                  .drop_duplicates("src_id")
                  .set_index("src_id")["player"]
                  .astype(str)
                  .to_dict()
            )
        if "pass_recipient" in df.columns:
            add = (
                df.loc[df["team"] == team, ["dst_id", "pass_recipient"]]
                     .dropna()
                     .drop_duplicates("dst_id")
                     .set_index("dst_id")["pass_recipient"]
                     .astype(str)
                  .to_dict()
            )
            for k, v in add.items():
                id_to_name.setdefault(k, v)

        # -------- Build Starting XI id whitelist (fallback to names if needed) --------
        starting_id_whitelist = set()
        if starting_ids:
            # Normalize types if df["src_id"] is integer dtype
            try:
                if pd.api.types.is_integer_dtype(df["src_id"]):
                    starting_id_whitelist = set(int(i) for i in starting_ids)
                else:
                    starting_id_whitelist = set(starting_ids)
            except Exception:
                starting_id_whitelist = set(starting_ids)
        elif starting_names:
            # Map names to ids via id_to_name
            name_to_ids = {}
            for pid, nm in id_to_name.items():
                name_to_ids.setdefault(nm, set()).add(pid)
            for nm in starting_names:
                for pid in name_to_ids.get(nm, []):
                    starting_id_whitelist.add(pid)

        # -------- Filter to this team's completed passes (StatsBomb: pass_outcome NaN == completed) --------
        passes = df[(df["type"] == "Pass") & (df["team"] == team)].copy()
        if passes.empty:
            raise HTTPException(status_code=404, detail=f"No passes for team '{team}'")
        if "pass_outcome" in passes.columns:
            passes = passes[passes["pass_outcome"].isna()].copy()

        # Keep only Starting XI → both ends must be starters
        if starting_id_whitelist:
            passes = passes[
                passes["src_id"].isin(starting_id_whitelist)
                & passes["dst_id"].isin(starting_id_whitelist)
            ].copy()
            if passes.empty:
                raise HTTPException(
                    status_code=404,
                    detail=f"No completed passes among Starting XI for team '{team}'",
                )

        # -------- Coordinates (uses global helper _to_xy) --------
        passes[["sx", "sy"]] = passes["location"].apply(_to_xy).to_list()
        passes[["ex", "ey"]] = passes["pass_end_location"].apply(_to_xy).to_list()

        # -------- Touches (team-only; then restrict to starters if present) --------
        touches = (
            df.loc[df["team"] == team, "src_id"]
              .value_counts()
              .rename_axis("player_id")
              .reset_index(name="touches")
        )
        if starting_id_whitelist:
            touches = touches[touches["player_id"].isin(starting_id_whitelist)]

        # -------- Average positions: mean of start (as passer) + end (as receiver) --------
        start_pos = passes.groupby("src_id")[["sx", "sy"]].mean().rename(columns={"sx": "x_s", "sy": "y_s"})
        recv_pos = passes.groupby("dst_id")[["ex", "ey"]].mean().rename(columns={"ex": "x_r", "ey": "y_r"})
        recv_pos.index.name = "src_id"
        avg_pos = start_pos.join(recv_pos, how="outer").reset_index(names=["player_id"])
        avg_pos["x"] = avg_pos[["x_s", "x_r"]].mean(axis=1, skipna=True)
        avg_pos["y"] = avg_pos[["y_s", "y_r"]].mean(axis=1, skipna=True)
        avg_pos = avg_pos[["player_id", "x", "y"]]

        # -------- Edges: pass counts between pairs (min_passes threshold) --------
        edges = (
            passes.groupby(["src_id", "dst_id"], dropna=True)
                  .size().rename("count").reset_index()
                  .rename(columns={"src_id": "player_id", "dst_id": "pass_recipient_id"})
        )
        edges = edges[edges["count"] >= int(min_passes)]

        # -------- Nodes table --------
        nodes = avg_pos.merge(touches, on="player_id", how="left")
        nodes["touches"] = nodes["touches"].fillna(0).astype(int)
        nodes["name"] = nodes["player_id"].map(id_to_name).fillna(nodes["player_id"].astype(str))

        if flip:
            nodes["x"] = 120 - nodes["x"]

        # -------- Merge node coords onto edges --------
        edges = edges.merge(
            nodes[["player_id", "x", "y"]].rename(columns={"player_id": "player_id_src", "x": "sx", "y": "sy"}),
            left_on="player_id", right_on="player_id_src", how="left"
        ).merge(
            nodes[["player_id", "x", "y"]].rename(columns={"player_id": "player_id_dst", "x": "ex", "y": "ey"}),
            left_on="pass_recipient_id", right_on="player_id_dst", how="left"
        )

        # -------- Build Plotly figure --------
        fig = go.Figure()

        # Edges: gray lines, width ~ log(pass count)
        if not edges.empty:
            for r in edges.itertuples(index=False):
                sx, sy, ex, ey = float(r.sx), float(r.sy), float(r.ex), float(r.ey)
                width = float(0.5 + 0.5 * np.log1p(int(r.count)))
                fig.add_trace(go.Scatter(
                    x=[sx, ex], y=[sy, ey],
                    mode="lines",
                    line=dict(width=width, color="gray"),
                    opacity=0.5,
                    hoverinfo="text",
                    text=f"{id_to_name.get(r.player_id, r.player_id)} → {id_to_name.get(r.pass_recipient_id, r.pass_recipient_id)}<br>passes: {int(r.count)}",
                    showlegend=False,
                ))

        # Nodes: size ~ touches
        if not nodes.empty:
            size_list = (14 + 0.045 * nodes["touches"]).clip(lower=8, upper=32).astype(float).tolist()
            touches_list = nodes["touches"].astype(int).tolist()
            x_list = nodes["x"].astype(float).tolist()
            y_list = nodes["y"].astype(float).tolist()
            text_list = nodes["name"].astype(str).tolist()

            team_color = TEAM_COLORS.get(team, "#1f77b4")
            fig.add_trace(go.Scatter(
                x=x_list, y=y_list,
                mode="markers+text",
                text=text_list,
                textposition="top center",
                marker=dict(size=size_list, line=dict(width=2, color="black"), color=team_color),
                hoverinfo="text",
                textfont=dict(size=11),
                name="players",
                customdata=[[t] for t in touches_list],
                hovertemplate="<b>%{text}</b><br>touches: %{customdata[0]}<extra></extra>",
            ))

        fig = make_pitch(fig)
        fig.update_layout(
            title=f"Passing Network — {team} (size ~ touches){' — Starting XI' if starting_id_whitelist else ''}",
            xaxis=dict(showgrid=False, visible=False, range=[0, 120]),
            yaxis=dict(showgrid=False, visible=False, range=[0, 80]),
            plot_bgcolor="white", height=600, width=900
        )
        fig.update_yaxes(autorange="reversed")

        payload = fig.to_dict()
        payload.update({
            "team": team,
            "node_count": int(nodes.shape[0]),
            "edge_count": int(edges.shape[0]),
            "min_passes": int(min_passes),
            "starting_xi_filter_applied": bool(starting_id_whitelist),
            "match_id": match_id if match_id is not None else None,
        })
        
        # Cache the result
        cache.set(cache_key, payload, cache_type="passing_network")
        
        return JSONResponse(content=jsonable_encoder(payload))

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"passing_network failed: {type(e).__name__}: {e}")



@app.get("/api/match/{filename}/important_moments", tags=["Match Analytics"], summary="Extract important match moments")
async def important_moments(filename: str):
    """
    Extract and return key moments from a match.
    
    Identifies significant events including high-probability shots, goals, own goals,
    and penalty-winning fouls. Results are sorted chronologically by period and timestamp.
    
    **Path Parameters:**
        - **filename** (str): S3 key of match events file (e.g., "events_3788741.csv")
        
    **Response Example:**
    ```json
    [
        {
            "who": "H. Kane",
            "when": "23:45",
            "what": "Shot",
            "outcome": "Goal",
            "xg": 0.324,
            "team": "England",
            "period": 1
        },
        {
            "who": "L. Bonucci",
            "when": "67:12",
            "what": "Shot",
            "outcome": "Goal",
            "xg": 0.089,
            "team": "Italy",
            "period": 2
        }
    ]
    ```
    
    **Returns:**
        list[dict]: Array of important moment objects
        - who (str): Player name (abbreviated)
        - when (str): Match time (MM:SS)
        - what (str): Event type (Shot, Own Goal Against, Foul Won)
        - outcome (str): Result (Goal, Saved, Penalty Won, etc.)
        - xg (float, optional): Expected goals value (0-1)
        - team (str): Team name
        - period (int): Match period (1, 2, 3 for ET, 4 for pens, 5 for post-match)
        
    **Filtering Criteria:**
        - Shots with xG >= 0.08 or outcome = Goal
        - All own goals against
        - All penalty-winning fouls
        - Events before 120:00 (excludes penalty shootouts)
        
    **Raises:**
        - HTTPException 500: File processing error
        
    **Notes:**
        - Falls back to local file if S3 unavailable
    - All NaN/Inf values replaced with None for JSON compatibility
    - Player names abbreviated (e.g., "Harry Kane" → "H. Kane")
    - Results are cached for 10 minutes
    """
    from cache import cache, async_s3
    
    cache_key = f"moments:{filename}:json"
    
    # Check cache first
    cached_result = cache.get(cache_key, cache_type="important_moments")
    if cached_result is not None:
        return cached_result
    
    try:
        # Load events with caching
        df_events = await async_s3.get_dataframe(filename, cache_type="events_df")
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


@app.get("/api/match/{filename}/game_phases", tags=["Match Analytics"], summary="Analyze match phases and momentum")
async def game_phases(filename: str):
    """
    Analyze match divided into phases based on key events.
    
    Segments the match into distinct tactical phases triggered by goals, half-time,
    red cards, and other significant events. Computes detailed metrics for each phase
    including possession, field position, and event statistics.
    
    **Path Parameters:**
        - **filename** (str): S3 key of match events file (e.g., "events_3788741.csv")
        
    **Response Example:**
    ```json
    {
        "phases": [
            {
                "phase_id": 1,
                "start_event": 0,
                "end_event": 245,
                "trigger": "Match Start",
                "minute": "0:00",
                "score_home": 0,
                "score_away": 0
            },
            {
                "phase_id": 2,
                "start_event": 246,
                "end_event": 512,
                "trigger": "Goal - England (H. Kane)",
                "minute": "23:45",
                "score_home": 1,
                "score_away": 0
            }
        ],
        "phase_metrics": [
            {
                "phase_id": 1,
                "home_possession": 48.5,
                "away_possession": 51.5,
                "home_shots": 3,
                "away_shots": 4,
                "home_box_entries": 12,
                "away_box_entries": 15
            }
        ]
    }
    ```
    
    **Returns:**
        dict: Object containing phases array and phase_metrics array
        
    **Phase Triggers:**
        - Match start
        - Goals (including own goals)
        - Half-time (Half End → Half Start)
        - Red cards
        - Extra time periods
        
    **Phase Metrics:**
        - Possession percentage (by pass count)
        - Box entries (within 18-yard box)
        - Final third entries
        - Shots, goals
        - Fouls, cards
        
    **Raises:**
        - HTTPException 500: File processing error
        
    **Notes:**
        - Falls back to local file if S3 unavailable
        - Requires 'possession_team' or 'team' column
        - Returns error object if fewer than 2 teams detected
        - All metrics calculated per phase independently
        - Results are cached for 10 minutes
    """
    from cache import cache, async_s3
    
    cache_key = f"phases:{filename}:json"
    
    # Check cache first
    cached_result = cache.get(cache_key, cache_type="game_phases")
    if cached_result is not None:
        return JSONResponse(content=jsonable_encoder(cached_result))
    
    try:
        # Load events with caching
        events = await async_s3.get_dataframe(filename, cache_type="events_df")
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
        from collections import OrderedDict
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

        # === Metrics helpers ===
        def to_point(val):
            if isinstance(val, (list, tuple, np.ndarray)) and len(val) == 2:
                return [float(val[0]), float(val[1])]
            if isinstance(val, str):
                try:
                    arr = json.loads(val)
                    if isinstance(arr, (list, tuple)) and len(arr) == 2:
                        return [float(arr[0]), float(arr[1])]
                except Exception:
                    try:
                        from ast import literal_eval
                        arr = literal_eval(val)
                        if isinstance(arr, (list, tuple)) and len(arr) == 2:
                            return [float(arr[0]), float(arr[1])]
                    except Exception:
                        return None
            return None

        def point_in_rect(point, rect):
            if not point:
                return False
            x, y = point
            (x0, y0, x1, y1) = rect
            return (x0 <= x <= x1) and (y0 <= y <= y1)

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

                # Box entries dedup (by possession across carries and passes)
                home_poss_box, away_poss_box = set(), set()
                if not carry_phase.empty and 'possession' in carry_phase.columns:
                    cb = carry_phase[(carry_phase['in_box']) & carry_phase['team'].notna()]
                    for _, r in cb[['team', 'possession']].iterrows():
                        if r['team'] == home_team:
                            home_poss_box.add(int(r['possession']))
                        elif r['team'] == away_team:
                            away_poss_box.add(int(r['possession']))
                if not pass_phase.empty and 'possession' in pass_phase.columns:
                    pb = pass_phase[(pass_phase['in_box']) & pass_phase['team'].notna()]
                    for _, r in pb[['team', 'possession']].iterrows():
                        if r['team'] == home_team:
                            home_poss_box.add(int(r['possession']))
                        elif r['team'] == away_team:
                            away_poss_box.add(int(r['possession']))
                box_entries_dedup = {home_team: len(home_poss_box), away_team: len(away_poss_box)}

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

                phase_metrics.append({
                    'phase_idx': ph['phase_idx'],
                    'start_minute': sm,
                    'start_second': ss,
                    'start_period': sp,
                    'end_minute': em,
                    'end_second': es,
                    'possession_pct_by_passes': possession_stats,
                    'box_entries': box_entries_dedup,
                    'final_third_entries': final_third_entries_dedup,
                    'fouls': fouls_per_team,
                    'cards': cards_per_team,
                    'chances': chances_per_team,
                    'shots_summary': shots_summary,
                    'penalties': penalties_per_team,
                    'goals': goals_per_team,
                    'score_at_start': score_start_counts,
                    'score_at_end': score_end_counts,
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

@app.get("/api/match/{filename}/possession_scene", tags=["Match Visualizations"], summary="Generate possession sequence visualization")
async def possession_scene(filename: str, possession: int = Query(..., description="Possession number to visualize")):
    """
    Generate a comprehensive possession sequence visualization with player tracking.
    
    Creates a detailed static image showing player positions, movement trails, and
    event locations for a specific possession sequence using StatsBomb 360 data.
    
    **Path Parameters:**
        - **filename** (str): S3 key of match events file (e.g., "events_3788741.csv")
        
    **Query Parameters:**
        - **possession** (int, required): Possession sequence number to visualize
        
    **Response:**
        PNG image (base64 encoded or direct binary) showing:
        - Soccer pitch with StatsBomb coordinates
        - Player positions from 360 freeze-frame data
        - Movement trails and passing sequences
        - Event markers (passes, shots, etc.)
        - Team colors and player numbers
        
    **Returns:**
        Response: PNG image file
        
    **Raises:**
        - HTTPException 404: File not found or possession number invalid
        - HTTPException 400: Missing required 360 data or invalid file format
        - HTTPException 500: Image generation error
        
    **Features:**
        - Full pitch visualization with markings
        - Player tracking data overlay
        - Possession flow animation
        - Event annotations
        - High-resolution static output
        - Team color coding
        
    **Notes:**
        - Requires corresponding frames_360_{match_id}.csv file in S3
        - Uses matplotlib for rendering
        - Returns PNG as base64-encoded string or binary
        - May take several seconds for complex possessions
    """
    import ast
    import json
    import matplotlib.pyplot as plt
    from matplotlib.patches import Arc, Rectangle
    import matplotlib.patches as patches
    import matplotlib.gridspec as gridspec
    import matplotlib.lines as mlines
    import matplotlib.patches as mpatches

    def draw_pitch(ax=None, color='black', lw=2):
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
        # ax.plot(12, 40, marker='o', color=color)
        # ax.plot(108, 40, marker='o', color=color)
        ax.plot(12, 80-40, marker='o', color=color)
        ax.plot(108, 80-40, marker='o', color=color)
        ax.set_xlim(-5, 125)
        ax.set_ylim(-5, 85)
        ax.set_xticks([]); ax.set_yticks([]); ax.set_aspect('equal')
        return ax

    def get_player(event):
        # Handles missing, None, NaN, float('nan'), and empty string -> returns "" instead of None
        if 'player' not in event:
            return ""
        val = event['player']
        if val is None:
            return ""
        if isinstance(val, float) and pd.isnull(val):
            return ""
        s = str(val).strip()
        if not s or s.lower() == 'nan' or s == 'N/A':
            return ""
        return s

    # 1. Utility/load + helper functions (from notebook)
    def try_json(x):
        if pd.isna(x): return None
        if isinstance(x, (list, dict)): return x
        s = str(x)
        try: return json.loads(s)
        except Exception:
            try: return json.loads(s.replace("'", '"'))
            except Exception: return None
    def parse_point(pt):
        if isinstance(pt, (list, tuple)) and len(pt) >= 2:
            return float(pt[0]), float(pt[1])
        return None
    # 2. Load the requested possession event data
    try:
        from cache import async_s3
        # Use async S3 client with caching
        events = await async_s3.get_dataframe(filename, cache_type="events_df")
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
            all_cols = df.columns.tolist(); first = [c for c in cols_first if c in all_cols]; rest = [c for c in all_cols if c not in first]; return df[first + rest]
        reordered_df = reorder_cols(possession_df, cols_first).copy(); reordered_df["source_possession"] = possession
        if "timestamp" in reordered_df.columns:
            reordered_df = reordered_df.sort_values("timestamp");
        elif "minute" in reordered_df.columns and "second" in reordered_df.columns:
            reordered_df = reordered_df.sort_values(["minute", "second"]);
        # SHOT FILTER
        def boolean_get(df, col):
            try: v = df.get(col, None); return v == True if v.dtype==bool else v.astype(str).str.lower() == "true" if v is not None else pd.Series([False]*len(df))
            except Exception: return pd.Series([False]*len(df))
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
            reordered_df_special = reordered_df_special.copy();
            events_arr = reordered_df_special.reset_index(drop=False)
            for cur_idx, row in events_arr.iterrows():
                is_high = False
                if row.get('type', None) in ('Ball Recovery', 'Interception'):
                    loc = row.get('location', None)
                    is_shot_team_ev = ('team' in row and row['team'] == shot_team)
                    if isinstance(loc, str):
                        try: loc_eval = ast.literal_eval(loc); loc = loc_eval if isinstance(loc_eval, (list, tuple)) else loc
                        except Exception: loc = None
                    high_x = isinstance(loc, (list, tuple)) and len(loc)==2 and float(loc[0])>60
                    if is_shot_team_ev and high_x:
                        start_idx = None
                        for prev_idx in range(cur_idx-1, -1, -1):
                            prev_row = events_arr.iloc[prev_idx]
                            if prev_row.get('team', None) == shot_team:
                                start_idx = prev_idx; break
                        has_other_team_event = False
                        if start_idx is not None:
                            opp_team_slice = events_arr.iloc[start_idx+1: cur_idx]
                            for _, opp_row in opp_team_slice.iterrows():
                                if opp_row.get('type', None) in ('Goal Keeper', 'Pressure', 'Duel', 'Block'): continue
                                opteam = opp_row.get('team', None)
                                if opteam != shot_team and pd.notna(opteam): has_other_team_event = True; break
                        if has_other_team_event: is_high = True
                high_turnover_list.append(is_high)
            reordered_df_special['High Turnover?'] = high_turnover_list
        else:
            reordered_df_special['High Turnover?'] = []
        # all helper fns
        def get_xy(loc_field):
            if isinstance(loc_field, (list, tuple)) and len(loc_field) >= 2: return float(loc_field[0]), float(loc_field[1])
            if isinstance(loc_field, str):
                try: arr = ast.literal_eval(loc_field); return (float(arr[0]), float(arr[1])) if isinstance(arr, (list, tuple)) and len(arr)>=2 else (np.nan, np.nan)
                except: pass
            return (np.nan, np.nan)
        def flip_y(y): return 80 - y if y is not None and not math.isnan(y) else y
        def flip_x(x): return 120 - x if x is not None and not math.isnan(x) else x
        def team_is_shot_team(row, shot_team):
            return (row.get('team', None) == shot_team)
        def plot_squiggly(ax, x1, y1, x2, y2, color='gray', lw=1, zorder=3):
            t = np.linspace(0, 1, 100); dx=x2-x1; dy=y2-y1; length=np.sqrt(dx*dx+dy*dy); 
            if length < 1e-2: return
            ortho_x = -dy / length; ortho_y = dx / length; A=min(0.8, 0.06*length); freq=8; squiggle=A*np.sin(2*np.pi*freq*t)
            x = x1 + dx*t + squiggle*ortho_x; y = y1 + dy*t + squiggle*ortho_y
            ax.plot(x, y, color=color, linewidth=lw, alpha=0.75, zorder=zorder)
        def format_player_name(full_name):
            if not full_name: return ""
            if isinstance(full_name, float) and pd.isnull(full_name): return ""
            s = str(full_name).strip()
            if not s or s == 'N/A' or s.lower() == 'nan': return ""
            parts = s.split()
            if len(parts)==1: return parts[0]
            return f"{parts[0][0]}. {parts[-1]}"
        # carry/legend/precompute logic
        ht_x_thresholds=[]
        if 'High Turnover?' in reordered_df_special.columns:
            for _, row in reordered_df_special.iterrows():
                if row.get('High Turnover?', False):
                    x, _ = get_xy(row.get('location'))
                    if not math.isnan(x): ht_x_thresholds.append(x)
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
                    if stype.strip().lower() == "penalty": shot_types_per_shot[idx] = "Penalty"
                    elif stype.strip().lower() == "free kick": shot_types_per_shot[idx] = "Free Kick"
        def get_passes_deflected_flags(df, shot_team):
            events=list(df.iterrows()); pass_deflected={};
            for idx in range(len(events)):
                ev_idx, ev = events[idx]
                if ev.get("type", None)=="Pass" and team_is_shot_team(ev, shot_team):
                    immediate_block = False
                    if idx+1 < len(events):
                        _, next_ev = events[idx+1]
                        if next_ev.get("type") == "Block" and not team_is_shot_team(next_ev, shot_team): immediate_block = True
                    own_deflected = False
                    pd_col = ev.get('pass_deflected', None)
                    if pd_col is True or (isinstance(pd_col, (np.bool_, bool)) and pd_col): own_deflected = True
                    pass_deflected[ev_idx] = immediate_block or own_deflected
            return pass_deflected
        def get_shots_deflected_flags(df, shot_team):
            events=list(df.iterrows()); shot_deflected={};
            for idx in range(len(events)):
                ev_idx, ev = events[idx]
                if ev.get("type", None)=="Shot" and team_is_shot_team(ev, shot_team):
                    if idx+1 < len(events):
                        _, next_ev = events[idx+1]
                        if next_ev.get("type") == "Block" and not team_is_shot_team(next_ev, shot_team): shot_deflected[ev_idx]=True
                        else: shot_deflected[ev_idx]=False
                    else: shot_deflected[ev_idx]=False
            return shot_deflected
        pass_deflected_flags = get_passes_deflected_flags(reordered_df_special, shot_team)
        shot_deflected_flags = get_shots_deflected_flags(reordered_df_special, shot_team)
        # --- BEGIN REAL PLOT ---
        fig = plt.figure(figsize=(16,8)); gs = gridspec.GridSpec(1,2,width_ratios=[7,2],wspace=0.01)
        ax = fig.add_subplot(gs[0])
        for xthresh in ht_x_thresholds:
            ax.add_patch(patches.Rectangle((xthresh, 0),120 - xthresh,80,facecolor='#fdfdbb',edgecolor='none',zorder=0,alpha=0.78 if len(ht_x_thresholds)==1 else 0.55))
        # draw pitch
        ax = draw_pitch(ax)
        # precompute artificial carries etc
        artificial_carry_indices = set()
        rows_list = list(reordered_df_special.iterrows())
        for n in range(len(rows_list)-1):
            i1, ev1 = rows_list[n]; i2, ev2 = rows_list[n+1]
            if ev1.get("type",None)=="Ball Receipt*" and ev2.get("type",None)=="Pass" and ev1.get("player",None)==ev2.get("player",None):
                s1,s2 = get_xy(ev1.get('location')),get_xy(ev2.get('location'))
                if not(math.isnan(s1[0]) or math.isnan(s2[0])):
                    if abs(s2[0]-s1[0]) >= 3.0:
                        artificial_carry_indices.add((i1,i2))
        special_intercept_ballreceipt_indices = set()
        for n in range(len(rows_list)-1):
            i1, ev1 = rows_list[n]; i2, ev2 = rows_list[n+1]
            if ev1.get("type",None)=="Interception" and not team_is_shot_team(ev1, shot_team) and ev2.get("type",None)=="Ball Receipt*" and team_is_shot_team(ev2, shot_team):
                x, _ = get_xy(ev1.get('location'))
                if not math.isnan(x): special_intercept_ballreceipt_indices.add(i1)
        # --- PLOT LOOP as in cell ---
        
        # Plot all event types as before -- but after normal carries, we will plot these "fake" carries.
        for i, event in reordered_df_special.iterrows():
            typ = event.get('type', None)
            if pd.isna(typ): continue
            # player = event.get('player', None)
            # player = event['player'] if 'player' in event and pd.notnull(event['player']) else None
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

            # ---------- DUEL AND DISPOSSESSED HANDLING (NEW SECTION) ----------
            if typ == "Duel":
                x, y = get_xy(event.get('location'))
                # y_flipped = flip_y(y)
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

            # --------------- FOUL WON / FOUL COMMITTED HANDLING (NEW SECTION) -------------------
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
                start_y_flipped = flip_y(start_y)
                end_y_flipped = end_y
                pass_type = event.get('pass_type', None)
                if not (np.isnan(start_x_flipped) or np.isnan(end_x_flipped)):
                    ax.plot([start_x_flipped, end_x_flipped], [start_y_flipped, end_y_flipped],
                            color='red', linestyle=':', lw=2.2, alpha=0.92, zorder=13)
                    if player_short:
                        ax.text(start_x_flipped, start_y_flipped, player_short, fontsize=7,
                                color='red', verticalalignment='top', horizontalalignment='right', zorder=40)
                    if (isinstance_type, str) and pass_type.strip().lower() == "corner":
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
                    else:
                        ax.plot(x, y_flipped, marker='o', color='red', markersize=15, markeredgewidth=2, markeredgecolor='black', zorder=6)
                        txt_color = 'red'
                    if player_short:
                        ax.text(x, y_flipped, player_short, fontsize=7, color=txt_color, verticalalignment='center', horizontalalignment='center', zorder=40, fontweight='semibold')
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
                end_x, end_y = get_xy(event.get('clearance_end_location'))
                start_y_flipped = flip_y(start_y)
                end_y_flipped = flip_y(end_y)
                if not (np.isnan(start_x) or np.isnan(end_x)):
                    if team_is_shot_team(event, shot_team):
                        ax.plot([start_x, end_x], [start_y_flipped, end_y_flipped], color='green', linestyle=':', lw=2.3, alpha=0.96, zorder=7)
                        txt_color = 'green'
                    else:
                        ax.plot([start_x, end_x], [start_y_flipped, end_y_flipped], color='red', linestyle=':', lw=2.3, alpha=0.96, zorder=7)
                        txt_color = 'red'
                    if player_short:
                        ax.text(start_x, start_y_flipped, player_short, fontsize=7, color=txt_color, verticalalignment='bottom', horizontalalignment='right', zorder=40)
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
                        ax.text(end_x, end_y_flipped, "🚫", fontsize=18, ha='center', va='center', color='red', zorder=15)
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
                        # Size reduced
                        # Use fill color: faint yellow
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
                    # No text label for "fake" carries, but if you want, you could:
                    # if player_short: ax.text(start_x, start_y_flipped, player_short, fontsize=6, ... )
                else:
                    start_x_flipped = flip_x(start_x)
                    end_x_flipped = flip_x(end_x)
                    ax.plot([start_x_flipped, end_x_flipped], [start_y, end_y], color='gray', linestyle='-', lw=2, alpha=0.6, zorder=3)
                    # No text label

        # --- LEGEND ---
        failed_interception_legend = mlines.Line2D([],[],marker='s',markersize=9,markerfacecolor='#fffabe', markeredgecolor='black',markeredgewidth=1.5,linestyle='None',lw=0,color='black',label='Failed Interception')
        legend_elements = [mlines.Line2D([],[],color='black',linestyle=':',lw=2,label='Pass (Shot Team)'),mlines.Line2D([],[],color='red',linestyle=':',lw=2.2,label='Pass (Opposition)'),mlines.Line2D([],[],color='black',linestyle='-',lw=2,label='Carry (Shot Team)'),mlines.Line2D([],[],color='gray',linestyle='-',lw=2,label='Carry (Opposition)'),mlines.Line2D([],[],color='green',lw=2,linestyle=(0,(6,3,2,3)),label='Dribble (Shot Team)'),mlines.Line2D([],[],color='red',lw=2,linestyle=(0,(6,3,2,3)),label='Dribble (Opposition)'),mlines.Line2D([],[],color='red',marker='o',markersize=7,lw=0,label='Dribbled Past'),mlines.Line2D([],[],color='red',marker='',lw=0,label='Block',linestyle='None'),mlines.Line2D([],[],color='green',marker='o',markersize=10,lw=0,label='Ball Recovery (Shot Team)'),mlines.Line2D([],[],color='red',marker='o',markersize=10,lw=0,label='Ball Recovery (Opposition)'),mlines.Line2D([],[],color='green',marker='x',markersize=10,lw=0,label='Pressure (Shot Team)'),mlines.Line2D([],[],color='gray',marker='x',markersize=6,lw=0,label='Pressure (Opposition)'),mlines.Line2D([],[],color='green',linestyle=':',lw=2.3,label='Clearance (Shot Team)'),mlines.Line2D([],[],color='red',linestyle=':',lw=2.3,label='Clearance (Opposition)'),mlines.Line2D([],[],color='green',linestyle='-',lw=2.5,label='Shot Path: GOAL'),mlines.Line2D([],[],color='red',linestyle='-',lw=2.5,label='Shot Path: Not Goal'),mpatches.Patch(facecolor='none',edgecolor='red',linewidth=2,label='Shot End: Off Target or Blocked',alpha=1),mlines.Line2D([],[],color='red',marker='$🚫$',markersize=16,lw=0,label='Shot End: Saved'),mlines.Line2D([],[],color='green',marker='s',markersize=10,lw=0,label='Interception (Shot Team)'),mlines.Line2D([],[],color='red',marker='s',markersize=10,lw=0,label='Interception (Opposition)'),failed_interception_legend,mlines.Line2D([],[],marker='o',color='w',markerfacecolor='w',markeredgecolor='black',markeredgewidth=2,lw=0,label='Shot Order'),mlines.Line2D([],[],marker=None,color='w',lw=0,label="Shooter's name shown above shot number"),mlines.Line2D([],[],marker=None,color='w',lw=0,label="('Penalty'/'Free Kick' shown above shot number)")]
        ax_legend = fig.add_subplot(gs[1]); ax_legend.axis('off')
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

        # --- DEBUG LOGGING FOR INFO CARD DECISION ---
        if not reordered_df_special.empty:
            type_ser = reordered_df_special['type'].astype(str).str.strip().str.lower()
            penalty_mask = type_ser == "foul won"
            if "foul_won_penalty" in reordered_df_special.columns:
                penalty_vals = reordered_df_special["foul_won_penalty"].astype(str).str.lower()
                foul_penalty_mask = (penalty_vals == "true") | (reordered_df_special["foul_won_penalty"] == True)
        else:
            0==0

        # Normal info card logic continues, but add debug output at each decision
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
        widen_factor = 1.42; right_shift = 0.10
        info_table = ax_legend.table(cellText=info_data, colLabels=info_cols, loc='upper center', cellLoc='center', colLoc='center', bbox=[-0.21+right_shift, 0.88, widen_factor, 0.12])
        info_table.auto_set_font_size(False); info_table.set_fontsize(10)
        cell_dict = info_table.get_celld(); ncols = len(info_cols)
        for (row, col), cell in cell_dict.items():
            cell.set_width(widen_factor/ncols);  cell.set_edgecolor('black');
            if row == 0: cell.set_text_props(weight='bold', color='black'); cell.set_facecolor('#efefef')
        plt.tight_layout()
        ax.set_title(f"{when} - {shot_team} - {who}", fontsize=18, fontweight='bold')
        buf = io.BytesIO()
        
        plt.savefig(buf, format="png", dpi=150)
        plt.close(fig)
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode("utf-8")
        return {"image_base64": img_base64}
    except Exception as e:
        traceback.print_exc(); 
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"possession_scene failed: {type(e).__name__}: {e}")
