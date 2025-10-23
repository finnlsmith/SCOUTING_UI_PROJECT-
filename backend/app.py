from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Response
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
from fastapi.encoders import jsonable_encoder
import traceback
import re
import base64
import matplotlib.pyplot as plt
#test
app = FastAPI()

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
# @app.get('/api/matches')
# def list_matches():
#     try:
#         response = s3_client.list_objects_v2(Bucket=S3_BUCKET)
#         if 'Contents' not in response:
#             return []
#         files = [obj['Key'] for obj in response['Contents'] if obj['Key'].endswith('.csv')]
#         return sorted(files)
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))
@app.get('/api/matches')
def list_matches():
    try:
        # 1️⃣ Get all CSV files in S3 bucket
        response = s3_client.list_objects_v2(Bucket=S3_BUCKET)
        if 'Contents' not in response:
            return []
        files = [obj['Key'] for obj in response['Contents'] if obj['Key'].endswith('.csv')]

        # 2️⃣ Load matches_df.csv from S3 directly
        obj = s3_client.get_object(Bucket=S3_BUCKET, Key="matches_df.csv")
        matches_df = pd.read_csv(obj['Body'])

        # 3️⃣ Build a lookup: match_id → "YYYY-MM-DD - Home vs Away"
        label_lookup = {}
        for _, row in matches_df.iterrows():
            match_id = str(row['match_id'])
            label_lookup[match_id] = f"{row['match_date']} - {row['home_team']} vs {row['away_team']}"

        # 4️⃣ Map files to readable labels
        formatted = []
        for f in files:
            # Extract numeric ID (e.g., 3788741)
            match_id = ''.join([c for c in f if c.isdigit()])
            label = label_lookup.get(match_id)
            if not label:
                continue

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

        return formatted

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/upload")
async def upload_csv(file: UploadFile = File(...)):
    """
    Receives a CSV file, processes it, and returns a Plotly figure.
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
            # If the file doesn’t have x/y, just show basic summary
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

@app.get("/api/match/{filename}/viz")
def get_match_viz(filename: str, team: str | None = Query(default=None)):
    """
    Robust shot map:
      - Works if xG/outcome columns are missing
      - Returns 404 for missing S3 keys or no shots
      - Adds scoreboard stats best-effort
    """
    try:
        # --- fetch CSV (404 if not found)
        try:
            obj = s3_client.get_object(Bucket=S3_BUCKET, Key=filename)
        except s3_client.exceptions.NoSuchKey:
            raise HTTPException(status_code=404, detail=f"S3 key not found: {filename}")
        df = pd.read_csv(io.BytesIO(obj["Body"].read()))

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
        }
        try:
            # try matches_df lookup
            try:
                mobj = s3_client.get_object(Bucket=S3_BUCKET, Key="matches_df.csv")
                mdf = pd.read_csv(mobj["Body"])
            except Exception:
                mdf = None

            # match_id from filename
            m = re.search(r"\d+", filename or "")
            match_id = int(m.group()) if m else None
            print(f"DEBUG match_id: {match_id}")
            
            if mdf is not None and match_id is not None and "match_id" in mdf.columns:
                row = mdf.loc[mdf["match_id"] == match_id]
                print(f"DEBUG lookup row: {row.head(1)}")
                if not row.empty:
                    r = row.iloc[0]
                    meta["home_team"] = r.get("home_team")
                    meta["away_team"] = r.get("away_team")
                    meta["home_score"] = int(r.get("home_score")) if pd.notna(r.get("home_score")) else None
                    meta["away_score"] = int(r.get("away_score")) if pd.notna(r.get("away_score")) else None
                    meta["competition_stage"] = r.get("competition_stage")

            # compute team shot counts/xG if possible
            if match_id is not None and mdf is not None and meta["home_team"] and meta["away_team"]:
                ev_key = f"events_{match_id}.csv"
                ev = pd.read_csv(io.BytesIO(s3_client.get_object(Bucket=S3_BUCKET, Key=ev_key)["Body"].read()))
                if {"type", "team"} <= set(ev.columns):
                    shot_df = ev[ev["type"] == "Shot"].copy()
                    # on target mask
                    sot = shot_df["shot_outcome"].astype(str).str.lower().str.contains("saved|goal") if "shot_outcome" in shot_df.columns else pd.Series(False, index=shot_df.index)
                    # counts
                    for side in ("home", "away"):
                        t = meta[f"{side}_team"]
                        if t:
                            meta[f"{side}_shots"] = int(shot_df[shot_df["team"] == t].shape[0])
                            meta[f"{side}_shots_on_target"] = int(shot_df[(shot_df["team"] == t) & sot].shape[0])
                            if "shot_statsbomb_xg" in shot_df.columns:
                                meta[f"{side}_xg_sum"] = float(pd.to_numeric(shot_df.loc[shot_df["team"] == t, "shot_statsbomb_xg"], errors="coerce").sum())
        except Exception as e2:
            print("⚠️ scoreboard/meta compute failed:", e2)

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
        return JSONResponse(content=jsonable_encoder(payload))

    except HTTPException:
        raise
    except Exception as e:
        # print full stack for quick debugging
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"/viz failed: {type(e).__name__}: {e}")
    

@app.get("/api/match/{filename}/passing_network")
def passing_network_like_matplotlib(
    filename: str,
    team: str = Query(...),
    min_passes: int = Query(1, ge=1),
    flip: bool = Query(False),
):
    try:
        # Load events
        obj = s3_client.get_object(Bucket=S3_BUCKET, Key=filename)
        events = pd.read_csv(io.BytesIO(obj["Body"].read()))
        cols = set(events.columns)

        # Column resolution (IDs or names)
        required_geom = {"location", "pass_end_location"}
        missing_geom = required_geom - cols
        if missing_geom:
            raise HTTPException(status_code=400, detail=f"Missing columns: {', '.join(sorted(missing_geom))}")

        if "type" not in cols or "team" not in cols:
            raise HTTPException(status_code=400, detail="Missing required columns 'type' and/or 'team'")

        # Build source/dest ids
        df = events.copy()
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

        # Map id -> display name (safe dict)
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
            # don't overwrite existing keys
            add = (df.loc[df["team"] == team, ["dst_id", "pass_recipient"]]
                     .dropna()
                     .drop_duplicates("dst_id")
                     .set_index("dst_id")["pass_recipient"]
                     .astype(str)
                     .to_dict())
            for k, v in add.items():
                id_to_name.setdefault(k, v)

        # Team passes (completed = outcome NaN, if present)
        passes = df[(df["type"] == "Pass") & (df["team"] == team)].copy()
        if passes.empty:
            raise HTTPException(status_code=404, detail=f"No passes for team '{team}'")

        if "pass_outcome" in passes.columns:
            passes = passes[passes["pass_outcome"].isna()].copy()

        # Geometry
        passes[["sx", "sy"]] = passes["location"].apply(_to_xy).to_list()
        passes[["ex", "ey"]] = passes["pass_end_location"].apply(_to_xy).to_list()

        # Touches = any event for team keyed by src_id (safe)
        touches = (
            df.loc[df["team"] == team, "src_id"]
              .value_counts()
              .rename_axis("player_id")
              .reset_index(name="touches")
        )

        # Average positions (start as passer + receive end)
        start_pos = passes.groupby("src_id")[["sx", "sy"]].mean().rename(columns={"sx": "x_s", "sy": "y_s"})
        recv_pos = passes.groupby("dst_id")[["ex", "ey"]].mean().rename(columns={"ex": "x_r", "ey": "y_r"})
        recv_pos.index.name = "src_id"
        avg_pos = start_pos.join(recv_pos, how="outer").reset_index(names=["player_id"])
        avg_pos["x"] = avg_pos[["x_s", "x_r"]].mean(axis=1, skipna=True)
        avg_pos["y"] = avg_pos[["y_s", "y_r"]].mean(axis=1, skipna=True)
        avg_pos = avg_pos[["player_id", "x", "y"]]

        # Edges
        edges = (
            passes.groupby(["src_id", "dst_id"], dropna=True)
                  .size().rename("count").reset_index()
                  .rename(columns={"src_id": "player_id", "dst_id": "pass_recipient_id"})
        )
        edges = edges[edges["count"] >= int(min_passes)]

        # Nodes table
        nodes = avg_pos.merge(touches, on="player_id", how="left")
        nodes["touches"] = nodes["touches"].fillna(0).astype(int)
        nodes["name"] = nodes["player_id"].map(id_to_name).fillna(nodes["player_id"].astype(str))

        if flip:
            nodes["x"] = 120 - nodes["x"]

        # Merge coordinates onto edges
        edges = edges.merge(
            nodes[["player_id", "x", "y"]].rename(columns={"player_id": "player_id_src", "x": "sx", "y": "sy"}),
            left_on="player_id", right_on="player_id_src", how="left"
        ).merge(
            nodes[["player_id", "x", "y"]].rename(columns={"player_id": "player_id_dst", "x": "ex", "y": "ey"}),
            left_on="pass_recipient_id", right_on="player_id_dst", how="left"
        )

        # ---- Build Plotly fig (ensure pure Python types) ----
        fig = go.Figure()

        # Edges (convert to floats explicitly)
        if not edges.empty:
            for r in edges.itertuples(index=False):
                sx, sy, ex, ey = float(r.sx), float(r.sy), float(r.ex), float(r.ey)
                width = float(0.5 + 0.5*np.log1p(int(r.count)))
                fig.add_trace(go.Scatter(
                    x=[sx, ex], y=[sy, ey],
                    mode="lines",
                    line=dict(width=width, color="gray"),
                    opacity=0.5,
                    hoverinfo="text",
                    text=f"{id_to_name.get(r.player_id, r.player_id)} → {id_to_name.get(r.pass_recipient_id, r.pass_recipient_id)}<br>passes: {int(r.count)}",
                    showlegend=False,
                ))

        # Nodes (size as plain list, customdata as list — NOT np.array)
        if not nodes.empty:
            size_list = (40 + 0.1*nodes["touches"]).clip(lower=30, upper=120).astype(float).tolist()
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
                customdata=[ [t] for t in touches_list ],
                hovertemplate="<b>%{text}</b><br>touches: %{customdata[0]}<extra></extra>",
            ))

        fig = make_pitch(fig)
        fig.update_layout(
            title=f"Passing Network — {team} (size ~ touches)",
            xaxis=dict(showgrid=False, visible=False, range=[0, 120]),
            yaxis=dict(showgrid=False, visible=False, range=[0, 80]),
            plot_bgcolor="white", height=600, width=900
        )
        fig.update_yaxes(autorange="reversed")

        payload = fig.to_dict()  # already basic types
        payload.update({
            "team": team,
            "node_count": int(nodes.shape[0]),
            "edge_count": int(edges.shape[0]),
            "min_passes": int(min_passes),
        })
        return JSONResponse(content=jsonable_encoder(payload))

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"passing_network failed: {type(e).__name__}: {e}" )


@app.get("/api/match/{filename}/important_moments")
def important_moments(filename: str):
    """
    Returns a list of key moments (high xG shots, goals, own goals, penalty-winning fouls) for a selected match.
    Fetches events file from S3 if available; falls back to local file for local dev.
    """
    import io
    import pandas as pd
    import numpy as np
    import math
    try:
        df_events = None
        try:
            obj = s3_client.get_object(Bucket=S3_BUCKET, Key=filename)
            df_events = pd.read_csv(io.BytesIO(obj["Body"].read()))
        except Exception as e:
            df_events = pd.read_csv(filename)
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
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"important_moments failed: {type(e).__name__}: {e}")


@app.get("/api/match/{filename}/possession_scene")
def possession_scene(filename: str, possession: int = Query(...)):
    """
    Given a match file and possession number, return a full advanced visualization as a static PNG — all notebook logic included.
    """
    import io, math, ast, json
    import numpy as np
    import pandas as pd
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
        try:
            obj = s3_client.get_object(Bucket=S3_BUCKET, Key=filename)
            events = pd.read_csv(io.BytesIO(obj["Body"].read()))
        except Exception:
            events = pd.read_csv(filename)
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
        shot_filter = ((
            (reordered_df["type"] == "Shot")&((pd.to_numeric(reordered_df.get('shot_statsbomb_xg', 0),errors='coerce') >= 0.08)| (reordered_df.get('shot_outcome', '') == 'Goal'))
        )|
            (reordered_df['type'] == 'Own Goal Against') |
            ((reordered_df['type'] == 'Foul Won') & boolean_get(reordered_df, 'foul_won_penalty')))
        shot_row = reordered_df[shot_filter]
        # Window selection
        if not shot_row.empty and not (shot_row.get('shot_type', pd.Series()).eq('Penalty').any()):
            shot_minute = shot_row.iloc[-1]['minute']; shot_second = shot_row.iloc[-1]['second']; shot_abs_time = shot_minute * 60 + shot_second; reordered_df = reordered_df.copy(); reordered_df['abs_time'] = reordered_df['minute'] * 60 + reordered_df['second']; reordered_df_special = reordered_df[(reordered_df['abs_time'] >= shot_abs_time - 10) & (reordered_df['abs_time'] <= shot_abs_time)]; reordered_df_special = reordered_df_special.drop(columns=['abs_time']) if 'abs_time' in reordered_df_special.columns else reordered_df_special
        else:
            if not shot_row.empty and (shot_row.get('shot_type', pd.Series()).eq('Penalty').any()): reordered_df_special = reordered_df
            else: reordered_df_special = reordered_df.iloc[0:0]
        
        # --- Begin new code: time window adjustment (WITH TIMESTAMP CONVERSION) ---
        import ast

        def convert_timestamp_to_seconds(timestamp_value):
            # Accepts "hh:mm:ss.sss" (like '00:34:37.080') or already numeric types.
            if isinstance(timestamp_value, (float, int, np.floating, np.integer)):
                return float(timestamp_value)
            if isinstance(timestamp_value, pd.Timedelta):
                return timestamp_value.total_seconds()
            if isinstance(timestamp_value, str):
                # Parse format: "hh:mm:ss[.sss]" (e.g., "00:34:37.080")
                try:
                    parts = timestamp_value.split(":")
                    if len(parts) == 3:
                        hours = int(parts[0])
                        minutes = int(parts[1])
                        seconds = float(parts[2])
                        return hours * 3600 + minutes * 60 + seconds
                    elif len(parts) == 2:
                        # fallback: "mm:ss[.sss]"
                        minutes = int(parts[0])
                        seconds = float(parts[1])
                        return minutes * 60 + seconds
                    elif len(parts) == 1:
                        # Just seconds
                        return float(parts[0])
                except Exception:
                    return np.nan
            return np.nan

        if not reordered_df_special.empty \
            and 'timestamp' in reordered_df_special.columns \
            and not pd.isnull(reordered_df_special['timestamp'].min()) \
            and not pd.isnull(reordered_df_special['timestamp'].max()):

            # Convert all timestamps in this frame to seconds for comparison
            ts_min_raw = reordered_df_special['timestamp'].min()
            ts_max_raw = reordered_df_special['timestamp'].max()
            ts_min = convert_timestamp_to_seconds(ts_min_raw)
            ts_max = convert_timestamp_to_seconds(ts_max_raw)
            ts_range = ts_max - ts_min

            # If window of timestamps is less than 3 sec:
            if ts_range < 3:
                # We want to include all events back to 5s before the first event in reordered_df_special (by minute/second)
                sec_min = reordered_df_special['second'].min()
                min_min = reordered_df_special.loc[reordered_df_special['second'].idxmin(), 'minute']
                if sec_min >= 5:
                    new_minute = min_min
                    new_second = sec_min - 5
                else:
                    # go to previous minute
                    new_minute = min_min - 1
                    if sec_min - 5 < 0:
                        new_second = 60 + (sec_min - 5)  # example: 4-5 == -1 => 59
                    else:
                        new_second = sec_min - 5

                # Make sure minute is not negative
                new_minute = max(new_minute, 0)
                # Compose new abs_time threshold
                abs_time_threshold = new_minute * 60 + new_second

                # Find the latest shot (end) again to ensure consistent upper bound
                if not shot_row.empty:
                    last_shot_minute = shot_row.iloc[-1]['minute']
                    last_shot_second = shot_row.iloc[-1]['second']
                    last_shot_abs_time = last_shot_minute * 60 + last_shot_second
                else:
                    last_shot_abs_time = None

                reordered_df = reordered_df.copy()
                events['abs_time'] = events['minute'] * 60 + events['second']
                # For the window, use [abs_time_threshold, last_shot_abs_time] if last_shot_abs_time available, else up through max
                if last_shot_abs_time is not None:
                    if (shot_row['shot_type'] == 'Penalty').any():
                        0==0
                    else:
                        reordered_df_special = events[
                            (events['abs_time'] >= abs_time_threshold) &
                            (events['abs_time'] <= last_shot_abs_time)
                        ]
                else:
                    reordered_df_special = events[
                        (events['abs_time'] >= abs_time_threshold)
                    ]
                if "abs_time" in reordered_df_special.columns:
                    reordered_df_special = reordered_df_special.drop(columns=['abs_time'])

                reordered_df_special = reorder_cols(reordered_df_special, cols_first)

        # --- End new code ---

        # --- SHOT TEAM logic ---
        shot_team = np.nan
        if not reordered_df_special.empty and 'type' in reordered_df_special.columns:
            shot_rows = reordered_df_special[reordered_df_special["type"] == 'Shot']
            own_goal_rows = reordered_df_special[reordered_df_special["type"] == 'Own Goal Against']
            foul_won_rows = (
                reordered_df_special[(reordered_df_special['type']=='Foul Won') & boolean_get(reordered_df_special, 'foul_won_penalty')] if 'foul_won_penalty' in reordered_df_special.columns else reordered_df_special[(reordered_df_special['type']=='Foul Won')]
            )
            if foul_won_rows is not None and not foul_won_rows.empty:
                shot_team = foul_won_rows['team'].iloc[0]
            elif not shot_rows.empty:
                shot_team = shot_rows['team'].iloc[0]
            elif not own_goal_rows.empty:
                og_team = own_goal_rows['team'].iloc[0]
                teams = pd.unique(reordered_df_special['team'].dropna())
                shot_tm_cand = [t for t in teams if t != og_team]
                shot_team = shot_tm_cand[0] if shot_tm_cand else np.nan
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
            if not isinstance(full_name, str) or len(full_name.strip()) == 0: return ""
            parts = full_name.split();
            if len(parts)==1: return parts[0]; first=parts[0]; last=parts[-1]; return f"{first[0]}. {last}"
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
        def get_passes_deflected_flags(df):
            events=list(df.iterrows()); pass_deflected={};
            for idx in range(len(events)):
                ev_idx, ev = events[idx]
                if ev.get("type", None)=="Pass" and team_is_shot_team(ev):
                    immediate_block = False
                    if idx+1 < len(events):
                        _, next_ev = events[idx+1]
                        if next_ev.get("type") == "Block" and not team_is_shot_team(next_ev): immediate_block = True
                    own_deflected = False
                    pd_col = ev.get('pass_deflected', None)
                    if pd_col is True or (isinstance(pd_col, (np.bool_, bool)) and pd_col): own_deflected = True
                    pass_deflected[ev_idx] = immediate_block or own_deflected
            return pass_deflected
        def get_shots_deflected_flags(df):
            events=list(df.iterrows()); shot_deflected={};
            for idx in range(len(events)):
                ev_idx, ev = events[idx]
                if ev.get("type", None)=="Shot" and team_is_shot_team(ev):
                    if idx+1 < len(events):
                        _, next_ev = events[idx+1]
                        if next_ev.get("type") == "Block" and not team_is_shot_team(next_ev): shot_deflected[ev_idx]=True
                        else: shot_deflected[ev_idx]=False
                    else: shot_deflected[ev_idx]=False
            return shot_deflected
        pass_deflected_flags = get_passes_deflected_flags(reordered_df_special)
        shot_deflected_flags = get_shots_deflected_flags(reordered_df_special)
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
            if ev1.get("type",None)=="Interception" and not team_is_shot_team(ev1) and ev2.get("type",None)=="Ball Receipt*" and team_is_shot_team(ev2):
                x, _ = get_xy(ev1.get('location'))
                if not math.isnan(x): special_intercept_ballreceipt_indices.add(i1)
        # --- PLOT LOOP as in cell ---
        
        # Plot all event types as before -- but after normal carries, we will plot these "fake" carries.
        for i, event in reordered_df_special.iterrows():
            typ = event.get('type', None)
            if pd.isna(typ): continue
            player = event.get('player', None)
            player_short = format_player_name(player)

            # (... plotting code unchanged ...)
            # [everything below here remains unchanged from your original]
            # Own Goal logic remains unchanged
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
                    if isinstance(pass_type, str) and pass_type.strip().lower() == "corner":
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
        # --- INFO CARD ---
        info_note, who, when, xg, outcome, score_string = None, 'N/A', 'N/A', 'N/A', 'N/A', 'N/A'
        def to_f_last(name):
            if not isinstance(name,str) or name.strip()=='' or name=='N/A': return 'N/A'; parts=name.strip().split(); return f"{parts[0][0]}. {parts[-1]}" if len(parts)>=2 else name
        if not shot_row.empty:
            sr = shot_row.iloc[-1]; who = to_f_last(sr.get('player', 'N/A'))
            xg_val = sr.get('shot_statsbomb_xg', 'N/A'); xg = round(xg_val,2) if isinstance(xg_val, (int,float)) else xg_val
            shot_type = sr.get('shot_type', '');         info_note = '(Penalty)' if isinstance(shot_type,str) and shot_type.strip().lower()=='penalty' else '(Free Kick)' if isinstance(shot_type,str) and shot_type.strip().lower()=='free kick' else None
            shot_minute = sr.get('minute', None); shot_second = sr.get('second', None); when = f"{int(shot_minute)}:{int(shot_second):02d}" if shot_minute is not None and shot_second is not None else 'N/A'; outcome = sr.get('shot_outcome','N/A')
        elif not reordered_df_special.empty and 'Foul Won' in reordered_df_special['type'].values:
            foul_row = reordered_df_special[(reordered_df_special['type']=='Foul Won') & (reordered_df_special.get('foul_won_penalty', False)==True)]
            if not foul_row.empty:
                fr = foul_row.iloc[-1]; who = to_f_last(fr.get('player','N/A')); info_note='(Penalty Won)'; shot_minute = fr.get('minute', None); shot_second = fr.get('second', None); when = f"{int(shot_minute)}:{int(shot_second):02d}" if shot_minute is not None and shot_second is not None else 'N/A'; outcome='N/A'
        if info_note is not None and who != 'N/A': who = f"{who} {info_note}"
        # Try score at shot time
        # Try score at shot time — only run if the events DataFrame exists
        if 'events' in locals():
            def row_time(row):
                return row['minute']*60 + row['second'] if 'minute' in row and 'second' in row else None

            min_sec = None
            if not shot_row.empty:
                sr = shot_row.iloc[-1]
                min_sec = sr['minute']*60 + sr['second'] if 'minute' in sr and 'second' in sr else None
            elif not reordered_df_special.empty and 'Foul Won' in reordered_df_special['type'].values:
                fr = foul_row.iloc[-1]
                min_sec = fr['minute']*60 + fr['second'] if 'minute' in fr and 'second' in fr else None

            e = events.copy()
            e['event_time'] = e.apply(row_time, axis=1)
            e = e[~pd.isnull(e['event_time'])]
            e = e[e['event_time'] <= min_sec] if min_sec is not None else e

            teams = pd.unique(e['team'].dropna())
            team_names = list(teams)
            st = shot_team if shot_team in teams else team_names[0] if len(team_names) > 0 else 'Team1'
            ot = [t for t in teams if t != st][0] if [t for t in teams if t != st] else (team_names[1] if len(team_names) > 1 else 'Team2')

            def score_for(team):
                goals = e[(e.get('shot_outcome','')=='Goal') & (e.get('team',None)==team)].shape[0]
                own_goals = e[(e['type']=='Own Goal For') & (e.get('team',None)==team)].shape[0]
                return goals + own_goals

            st_score = score_for(st)
            ot_score = score_for(ot)
            score_string = f"{st[:3]} {st_score}-{ot_score} {ot[:3]}"
        else:
            score_string = 'N/A'

        teams = pd.unique(e['team'].dropna()); team_names=list(teams)
        st = shot_team if shot_team in teams else team_names[0] if len(team_names)>0 else 'Team1'
        ot = [t for t in teams if t != st][0] if [t for t in teams if t!= st] else (team_names[1] if len(team_names)>1 else 'Team2')
        def score_for(team):
            goals = e[(e.get('shot_outcome','')=='Goal') & (e.get('team',None)==team)].shape[0]; own_goals=e[(e['type']=='Own Goal For') & (e.get('team',None)==team)].shape[0]; return goals+own_goals
        st_score = score_for(st); ot_score = score_for(ot); score_string = f"{st[:3]} {st_score}-{ot_score} {ot[:3]}"
        info_cols = ["Who", "When", 'XG', "Result", "Score"]; info_data=[[who,when,xg,outcome,score_string]]
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
        import traceback
        traceback.print_exc(); from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"possession_scene failed: {type(e).__name__}: {e}")