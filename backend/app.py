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
            else:
                home_team = away_team = None
                home_score = away_score = None
        except Exception as e:
            print("⚠️ Could not fetch score info:", e)
            home_team = away_team = None
            home_score = away_score = None

        # --- Combine figure + score info ---
        fig_dict = fig.to_dict()
        fig_dict.update({
            "home_team": home_team,
            "away_team": away_team,
            "home_score": home_score,
            "away_score": away_score
        })
        return fig_dict


    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
