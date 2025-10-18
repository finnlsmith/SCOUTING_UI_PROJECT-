from fastapi import FastAPI, UploadFile, File, HTTPException
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
    allow_origins=["https://columbia-msds-f25-soccer.onrender.com", "http://localhost:3000"],
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

@app.get("/api/match/{filename}/viz")
def get_match_viz(filename: str, team: str | None = None):
    """
    Generate a shot map for a specific match.
    If ?team=<TeamName> is provided, returns only that team's shots.
    Otherwise, returns a combined view (home vs away).
    """
    try:
        print(f"📂 Fetching file from S3: {filename}")
        response = s3_client.get_object(Bucket=S3_BUCKET, Key=filename)
        df = pd.read_csv(io.BytesIO(response['Body'].read()))
        print(f"✅ File downloaded from S3 ({len(df)} rows)")

        if "type" not in df.columns or "location" not in df.columns:
            raise HTTPException(status_code=400, detail="Missing required columns")

        shots = df[df["type"] == "Shot"].copy()
        if shots.empty:
            raise HTTPException(status_code=400, detail="No shot events found")

        # --- Convert location to x, y ---
        def to_xy(val):
            try:
                arr = json.loads(val) if isinstance(val, str) else val
                if isinstance(arr, (list, tuple)) and len(arr) >= 2:
                    return float(arr[0]), float(arr[1])
            except Exception:
                pass
            return (np.nan, np.nan)

        shots[["sx", "sy"]] = shots["location"].apply(to_xy).to_list()
        shots["xg"] = pd.to_numeric(shots.get("shot_statsbomb_xg"), errors="coerce")
        shots["is_goal"] = shots.get("shot_outcome").eq("Goal")

        # --- Identify teams ---
        teams = shots["team"].dropna().unique().tolist()
        if len(teams) < 2:
            teams = teams + ["Opponent"]
        home, away = teams[0], teams[1]

        # --- Filter if team param is provided ---
        if team:
            shots = shots.loc[shots["team"] == team]
            if shots.empty:
                raise HTTPException(status_code=404, detail=f"No shots found for team '{team}'")

        # --- Build shot map figure (new version) ---
        fig = go.Figure()
        subset = shots.copy()
        is_goal = subset["shot_outcome"].fillna("").str.lower() == "goal"

        # All shots
        fig.add_trace(go.Scatter(
            x=subset["sx"],
            y=subset["sy"],
            mode="markers",
            marker=dict(
                size=10 + 60 * subset["xg"].fillna(0),
                color=subset["xg"],
                colorscale="Reds",
                cmin=0,
                cmax=subset["xg"].max(),
                showscale=True,
                colorbar=dict(title="xG"),
                line=dict(width=0)
            ),
            text=[
                f"<b>{row['player']}</b><br>"
                f"Minute: {row.get('minute', '')}<br>"
                f"Second: {row.get('second', '')}<br>"
                f"xG: {row['xg']:.3f}<br>"
                f"Outcome: {row['shot_outcome']}"
                for _, row in subset.iterrows()
            ],
            hoverinfo="text",
            name="Shot"
        ))

        # Goals outlined in black
        if is_goal.any():
            fig.add_trace(go.Scatter(
                x=subset.loc[is_goal, "sx"],
                y=subset.loc[is_goal, "sy"],
                mode="markers",
                marker=dict(
                    size=10 + 60 * subset.loc[is_goal, "xg"].fillna(0),
                    color=subset.loc[is_goal, "xg"],
                    colorscale="Reds",
                    cmin=0,
                    cmax=subset["xg"].max(),
                    showscale=False,
                    line=dict(width=3, color="black")
                ),
                text=[
                    f"<b>{row['player']}</b><br>"
                    f"Minute: {row.get('minute', '')}<br>"
                    f"Second: {row.get('second', '')}<br>"
                    f"xG: {row['xg']:.3f}<br>"
                    f"Outcome: {row['shot_outcome']}"
                    for _, row in subset[is_goal].iterrows()
                ],
                hoverinfo="text",
                name="Goal"
            ))

        # Add pitch
        fig = make_pitch(fig)

        fig.update_layout(
            title=f"Shot Map — {team or (home + ' vs ' + away)}",
            xaxis=dict(showgrid=False, visible=False, range=[0, 120]),
            yaxis=dict(showgrid=False, visible=False, range=[0, 80]),
            plot_bgcolor="white",
            height=600,
            width=900
        )
        fig.update_yaxes(autorange="reversed")

        # --- Fetch score info from matches_df.csv on S3 ---
        try:
            obj = s3_client.get_object(Bucket=S3_BUCKET, Key="matches_df.csv")
            matches_df = pd.read_csv(obj["Body"])

            # Extract match_id digits from filename (e.g., 'events_3788769.csv' → 3788769)
            import re
            match_id_match = re.search(r"\d+", filename)
            match_id = int(match_id_match.group()) if match_id_match else None

            row = matches_df[matches_df["match_id"] == match_id]
            if not row.empty:
                row = row.iloc[0]
                home_team = row["home_team"]
                away_team = row["away_team"]
                home_score = int(row["home_score"])
                away_score = int(row["away_score"])
                competition_stage = row.get("competition_stage", None)
            else:
                home_team = away_team = None
                home_score = away_score = None
                competition_stage = None
        except Exception as e:
            print("⚠️ Could not fetch score info:", e)
            home_team = away_team = None
            home_score = away_score = None

        # --- Compute shot counts, shots on target, and total xG ---
        home_shots = away_shots = None
        home_shots_on_target = away_shots_on_target = None
        home_xg_sum = away_xg_sum = None

        try:
            events_key = f"events_{match_id}.csv"
            print(f"🎯 Loading events CSV for shots/xG: {events_key}")
            ev_obj = s3_client.get_object(Bucket=S3_BUCKET, Key=events_key)
            ev_df = pd.read_csv(io.BytesIO(ev_obj["Body"].read()))

            if {"type", "team", "shot_outcome", "shot_statsbomb_xg"} <= set(ev_df.columns):
                # All shots
                home_shots = int(ev_df[(ev_df["team"] == home_team) & (ev_df["type"] == "Shot")].shape[0])
                away_shots = int(ev_df[(ev_df["team"] == away_team) & (ev_df["type"] == "Shot")].shape[0])

                # Shots on target (Saved or Goal)
                on_target = ["Saved", "Goal"]
                home_shots_on_target = int(ev_df[
                    (ev_df["team"] == home_team) & 
                    (ev_df["type"] == "Shot") &
                    (ev_df["shot_outcome"].isin(on_target))
                ].shape[0])
                away_shots_on_target = int(ev_df[
                    (ev_df["team"] == away_team) &
                    (ev_df["type"] == "Shot") &
                    (ev_df["shot_outcome"].isin(on_target))
                ].shape[0])

                # Total xG
                home_xg_sum = float(ev_df[
                    (ev_df["team"] == home_team) &
                    (ev_df["type"] == "Shot")
                ]["shot_statsbomb_xg"].sum())
                away_xg_sum = float(ev_df[
                    (ev_df["team"] == away_team) &
                    (ev_df["type"] == "Shot")
                ]["shot_statsbomb_xg"].sum())

                print(f"📊 {home_team}: Shots={home_shots}, On Target={home_shots_on_target}, xG={home_xg_sum:.2f}")
                print(f"📊 {away_team}: Shots={away_shots}, On Target={away_shots_on_target}, xG={away_xg_sum:.2f}")

        except Exception as e:
            print("⚠️ Could not compute shots/xG stats:", e)

        # --- Combine figure + score info ---
        fig_dict = fig.to_dict()
        fig_dict.update({
            "home_team": home_team,
            "away_team": away_team,
            "home_score": home_score,
            "away_score": away_score,
            "competition_stage": competition_stage,
            "home_shots": home_shots,
            "away_shots": away_shots,  # 🆕 add this
            "home_shots_on_target": home_shots_on_target,
            "away_shots_on_target": away_shots_on_target,
            "home_xg_sum": home_xg_sum,
            "away_xg_sum": away_xg_sum,
        })
        print("🚀 Sending keys:", list(fig_dict.keys()))
        return JSONResponse(content=jsonable_encoder(fig_dict))


    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/api/match/{filename}/passing_network")
def get_passing_network(filename: str, team: str | None = None):
    """
    Generate a passing network visualization for a specific match and team.
    """
    try:
        print(f"📂 Fetching file from S3 for passing network: {filename}")
        response = s3_client.get_object(Bucket=S3_BUCKET, Key=filename)
        df = pd.read_csv(io.BytesIO(response['Body'].read()))

        # --- Required columns ---
        needed = {"type", "team", "player", "pass_recipient", "location", "pass_end_location"}
        missing = needed - set(df.columns)
        if missing:
            raise HTTPException(status_code=400, detail=f"Missing required columns: {sorted(missing)}")

        # --- Filter for passes ---
        passes = df[df["type"] == "Pass"].copy()
        if passes.empty:
            raise HTTPException(status_code=400, detail="No pass events found")

        # Pick default team if not specified
        if not team:
            team = passes["team"].dropna().mode().iat[0]

        passes = passes.loc[passes["team"] == team].copy()
        if passes.empty:
            raise HTTPException(status_code=404, detail=f"No passes found for team '{team}'")

        # --- Parse coordinates ---
        def to_xy(val):
            try:
                arr = json.loads(val) if isinstance(val, str) else val
                if isinstance(arr, (list, tuple)) and len(arr) >= 2:
                    return float(arr[0]), float(arr[1])
            except Exception:
                pass
            return (np.nan, np.nan)

        passes[["sx", "sy"]] = passes["location"].apply(to_xy).to_list()
        passes[["ex", "ey"]] = passes["pass_end_location"].apply(to_xy).to_list()

        # --- Compute player positions from both pass starts and ends ---
        start_pos = (
            passes.dropna(subset=["player"])
                  .groupby("player", as_index=False)[["sx", "sy"]]
                  .mean()
                  .rename(columns={"sx": "x", "sy": "y"})
        )

        recv_pos = (
            passes.dropna(subset=["pass_recipient"])
                  .groupby("pass_recipient", as_index=False)[["ex", "ey"]]
                  .mean()
                  .rename(columns={"pass_recipient": "player", "ex": "x2", "ey": "y2"})
        )

        avg_pos = start_pos.merge(recv_pos, on="player", how="outer")
        avg_pos["x"] = avg_pos[["x", "x2"]].mean(axis=1)
        avg_pos["y"] = avg_pos[["y", "y2"]].mean(axis=1)
        avg_pos = avg_pos.drop(columns=["x2", "y2"])

        # --- Touches ---
        touches = (
            df.loc[(df["team"] == team) & df["player"].notna()]
              .groupby("player", as_index=False)
              .size()
              .rename(columns={"size": "touches"})
        )
        avg_pos = avg_pos.merge(touches, on="player", how="left")

        # --- Pair pass counts (edges) ---
        pair_counts = (
            passes.dropna(subset=["player", "pass_recipient"])
                  .groupby(["player", "pass_recipient"], as_index=False)
                  .size()
                  .rename(columns={"size": "count"})
        )

        have_xy = set(avg_pos.dropna(subset=["x", "y"])["player"])
        pair_counts = pair_counts[
            pair_counts["player"].isin(have_xy) & pair_counts["pass_recipient"].isin(have_xy)
        ]

        # --- Build Plotly figure ---
        from plotly.colors import qualitative as qual
        palette = (qual.Plotly + qual.D3 + qual.Set3)

        fig = go.Figure()

        # Edges
        for i, row in pair_counts.reset_index(drop=True).iterrows():
            a = avg_pos.loc[avg_pos["player"] == row["player"], ["x", "y"]].values
            b = avg_pos.loc[avg_pos["player"] == row["pass_recipient"], ["x", "y"]].values
            if len(a) and len(b):
                fig.add_trace(
                    go.Scatter(
                        x=[a[0, 0], b[0, 0]],
                        y=[a[0, 1], b[0, 1]],
                        mode="lines",
                        line=dict(
                            width=0.5 + 0.6 * np.log1p(row["count"]),
                            color=palette[i % len(palette)],
                        ),
                        opacity=0.7,
                        hoverinfo="text",
                        text=[None, f"{row['player']} → {row['pass_recipient']} ({int(row['count'])})"],
                        showlegend=False,
                    )
                )

        # Nodes (players)
        nodes_xy = avg_pos.dropna(subset=["x", "y"]).copy()
        nodes_xy["size_px"] = 40 + 3 * nodes_xy["touches"].fillna(0)

        fig.add_trace(
            go.Scatter(
                x=nodes_xy["x"],
                y=nodes_xy["y"],
                mode="markers",
                marker=dict(
                    size=nodes_xy["size_px"],
                    color="royalblue",
                    opacity=0.9,
                    line=dict(width=1, color="white"),
                ),
                hoverinfo="text",
                text=[
                    f"{p}<br>Touches: {int(t) if pd.notna(t) else 0}"
                    for p, t in zip(nodes_xy["player"], nodes_xy["touches"])
                ],
                name="Players",
                showlegend=False,
            )
        )

        # Labels
        fig.add_trace(
            go.Scatter(
                x=nodes_xy["x"],
                y=nodes_xy["y"],
                mode="text",
                text=nodes_xy["player"],
                textposition="top center",
                textfont=dict(size=12),
                hoverinfo="skip",
                showlegend=False,
            )
        )

        # Pitch & layout
        fig = make_pitch(fig)
        fig.update_layout(
            title=f"Passing Network — {team} (size ~ touches)",
            xaxis=dict(showgrid=False, visible=False, range=[0, 120]),
            yaxis=dict(showgrid=False, visible=False, range=[0, 80]),
            plot_bgcolor="white",
            height=600,
            width=900,
            margin=dict(l=40, r=40, t=60, b=30),
        )
        fig.update_yaxes(autorange="reversed")

        return fig.to_dict()

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
