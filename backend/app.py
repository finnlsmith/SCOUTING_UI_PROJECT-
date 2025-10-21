from fastapi import FastAPI, UploadFile, File, HTTPException, Query
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
#test
app = FastAPI()

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
    allow_origins=["https://columbia-msds-f25-soccer.onrender.com", "http://localhost:3000", "https://columbia-msds-f25-soccer-frontend.onrender.com"],
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
            size_list = (40 + 1*nodes["touches"]).clip(lower=30, upper=120).astype(float).tolist()
            touches_list = nodes["touches"].astype(int).tolist()
            x_list = nodes["x"].astype(float).tolist()
            y_list = nodes["y"].astype(float).tolist()
            text_list = nodes["name"].astype(str).tolist()

            fig.add_trace(go.Scatter(
                x=x_list, y=y_list,
                mode="markers+text",
                text=text_list,
                textposition="top center",
                marker=dict(size=size_list, line=dict(width=2, color="black")),
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