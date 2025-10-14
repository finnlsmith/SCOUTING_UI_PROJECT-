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
def get_match_viz(filename: str):
    """
    Returns the visualization data for a specific match file.
    """
    try:
        print(f"📂 Fetching file from S3: {filename}")
        response = s3_client.get_object(Bucket=S3_BUCKET, Key=filename)
        content = response['Body'].read()
        df = pd.read_csv(io.BytesIO(content))
        print(f"✅ File downloaded from S3 ({len(content)} bytes)")
        
        if "type" not in df.columns or "location" not in df.columns:
            raise HTTPException(status_code=400, detail="Missing 'type' or 'location' columns")
        
        #extract shots
        shots = df[df["type"] == "Shot"].copy()
        if shots.empty:
            raise HTTPException(status_code=400, detail="No shot events found")
        
        def to_xy(val):
            try: 
                arr = json.loads(val) if isinstance(val, str) else val
                if isinstance(arr, (list, tuple)) and len(arr) >=2:
                    return float(arr[0], float(arr[1]))
            except Exception:
                pass
            return (np.nan, np.nan)

        shots[['sx', 'sy']] = shots['locations'].apply(to_xy).to_list()
        shots["xg"] = pd.to_numeric(shots.get("shot_statsbomb_xg"), errors="coerce")
        shots["is_goal"] = (shots.get("shot_outcome") == "Goal")

        #identify teams
        teams = shots["team"].dropna().unique().tolist()
        if len(teams) < 2:
            teams = teams + ["Opponent"]
        home, away = teams[0], teams[1]

        shots_h = shots.loc[shots["team"] == home].copy()
        shots_a = shots.loc[shots["team"] == away].copy()

        #mirror sides for consistenacy 
        def mirror_array(arr):
            arr = np.array(arr, dtype=float)
            arr[:, 0] = 120 - arr[:, 0]
            arr[:, 1] = 80 - arr[:, 1]
            return arr

        mask_h = (shots_h["sx"] > 60) & shots_h["sx"].notna()
        if mask_h.any():
            shots_h.loc[mask_h, ["sx", "sy"]] = mirror_array(shots_h.loc[mask_h, ["sx", "sy"]])
        
        mask_a = (shots_a["sx"] < 60) & shots_a["sx"].notna()
        if mask_a.any():
            shots_a.loc[mask_a, ["sx", "sy"]] = mirror_array(shots_a.loc[mask_a, ["sx", "sy"]])

        #pitch outline 
        fig = go.Figure()
        pitch_shapes = [
            dict(type="rect", x0=0, y0=0, x1=120, y1=80, line=dict(color="black", width=2)),
            dict(type="line", x0=60, y0=0, x1=60, y1=80, line=dict(color="black", width=2)),
            dict(type="circle", x0=52, y0=32, x1=68, y1=48, line=dict(color="black", width=2)),
            dict(type="circle", x0=59, y0=39, x1=61, y1=41, line=dict(color="black", width=2)),
        ]
        fig.update_layout(shapes=pitch_shapes)

        #plot home (left side)
        fig.add_trace(go.Scatter(
            x=shots_h["sx"], y=shots_h["sy"],
            mode="markers",
            marker=dict(
                size=8 + 30 * shots_h["xg"].fillna(0),
                color="royalblue",
                opacity=0.7,
                line=dict(width=0)
            ),
            name=f"{home} shots",
            hovertext=[
                f"xG: {xg:.2f}<br>Outcome: {'Goal' if g else 'Miss'}"
                for xg, g in zip(shots_h["xg"].fillna(0), shots_h["is_goal"])
            ],
            hoverinfo="text"
        ))

        #plot away (right side)
        fig.add_trace(go.Scatter(
            x=shots_a["sx"], y=shots_a["sy"],
            mode="markers",
            marker=dict(
                size=8 + 30 * shots_a["xg"].fillna(0),
                color="orange",
                opacity=0.7,
                symbol="square"
            ),
            name=f"{away} shots",
            hovertext=[
                f"xG: {xg:.2f}<br>Outcome: {'Goal' if g else 'Miss'}"
                for xg, g in zip(shots_a["xg"].fillna(0), shots_a["is_goal"])
            ],
            hoverinfo="text"
        ))

        ag = shots_a[shots_a["is_goal"]]
        if not ag.empty:
            fig.add_trace(go.Scatter(
                x=ag["sx"], y=ag["sy"],
                mode="markers",
                marker=dict(size=8 + 30 * ag["xg"].fillna(0),
                            color="rgba(0,0,0,0)", line=dict(color="black", width=2),
                            symbol="square"),
                name=f"{away} goals"
            ))
        #layout
        fig.update_layout(
            title=f"Shot Map — {home} (left) vs {away} (right)<br>(size ~ xG; rings = goals)",
            xaxis=dict(range=[0, 120], showgrid=False, zeroline=False, visible=False),
            yaxis=dict(range=[0, 80], showgrid=False, zeroline=False, visible=False),
            plot_bgcolor="white",
            height=600,
            showlegend=True,
            legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="center", x=0.5)
        )
        return fig.to_dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))