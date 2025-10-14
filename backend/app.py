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
#test
app = FastAPI()

# Allow React frontend (port 3000 or 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, use specific domain
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

        # --- Build shot map figure ---
        fig = go.Figure()

        # Pitch outline
        pitch_shapes = [
            dict(type="rect", x0=0, y0=0, x1=120, y1=80, line=dict(color="black", width=2)),
            dict(type="line", x0=60, y0=0, x1=60, y1=80, line=dict(color="black", width=2)),
            dict(type="circle", x0=52, y0=32, x1=68, y1=48, line=dict(color="black", width=2)),
            dict(type="circle", x0=59, y0=39, x1=61, y1=41, line=dict(color="black", width=2)),
        ]
        fig.update_layout(shapes=pitch_shapes)

        # Plot points (filtered if team is provided)
        colors = {"home": "royalblue", "away": "orange"}
        color = colors.get("home") if not team or team == home else colors.get("away")

        fig.add_trace(go.Scatter(
            x=shots["sx"], y=shots["sy"],
            mode="markers",
            marker=dict(
                size=8 + 30 * shots["xg"].fillna(0),
                color=color,
                opacity=0.7,
                line=dict(width=0)
            ),
            text=[
                f"<b>{row['player']}</b><br>xG: {row['xg']:.2f}<br>Outcome: {row['shot_outcome']}"
                for _, row in shots.iterrows()
            ],
            hoverinfo="text",
            name=team if team else f"{home} / {away}"
        ))

        fig.update_layout(
            title=f"Shot Map — {team or (home + ' vs ' + away)}",
            xaxis=dict(range=[0, 120], showgrid=False, zeroline=False, visible=False),
            yaxis=dict(range=[0, 80], showgrid=False, zeroline=False, visible=False),
            plot_bgcolor="white",
            height=600
        )

        fig.update_yaxes(autorange="reversed")
        return fig.to_dict()

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
