# routes/matches.py

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse, Response
import pandas as pd
import plotly.express as px
import io
import logging

from config.settings import s3_client, S3_BUCKET

router = APIRouter(tags=["Matches"])
logger = logging.getLogger(__name__)


# @router.get("/api/matches", summary="List all available matches")
# async def list_matches():
#     """
#     List available matches using the precomputed matches_df.csv in S3.

#     Expects a file `matches_df.csv` in the S3 bucket defined by S3_BUCKET.
#     Returns the rows as a list of dicts.
#     """
#     try:
#         # Fetch matches_df.csv from S3
#         obj = s3_client.get_object(Bucket=S3_BUCKET, Key="matches_df.csv")
#     except Exception as e:
#         logger.exception("Failed to load matches_df.csv from S3")
#         raise HTTPException(
#             status_code=500,
#             detail=f"Failed to load matches from S3: {e}",
#         )

#     try:
#         # Read CSV into DataFrame
#         df = pd.read_csv(io.BytesIO(obj["Body"].read()))

#         # Optional: sort or filter here if needed
#         # df = df.sort_values(["tournament", "match_date"])

#         # Return list of dicts
#         # return df.to_dict(orient="records")
#         df = df.replace([float("inf"), float("-inf")], pd.NA)

#         # Convert to Python-native types safely
#         clean = df.where(pd.notnull(df), None)

#         return clean.to_dict(orient="records")



#     except Exception as e:
#         logger.exception("Failed to parse matches_df.csv")
#         raise HTTPException(
#             status_code=500,
#             detail=f"Failed to parse matches file: {e}",
#         )

@router.get("/api/matches", summary="List all available matches")
async def list_matches():
    """
    Return matches in the exact structure expected by the frontend:
    {
        "file": "events_3788741.csv",
        "label": "2021-07-11 - Italy vs England – Events"
    }
    """
    try:
        obj = s3_client.get_object(Bucket=S3_BUCKET, Key="matches_df.csv")
    except Exception as e:
        logger.exception("Failed to load matches_df.csv from S3")
        raise HTTPException(500, f"Failed to load matches from S3: {e}")

    try:
        df = pd.read_csv(io.BytesIO(obj["Body"].read()))

        results = []

        for _, row in df.iterrows():
            match_id = str(row["match_id"])
            label = f"{row['match_date']} - {row['home_team']} vs {row['away_team']}"

            # The frontend expects event and frame files for each match
            results.append({
                "file": f"events_{match_id}.csv",
                "label": f"{label} – Events"
            })

            results.append({
                "file": f"frames_360_{match_id}.csv",
                "label": f"{label} – Frames 360"
            })

        return results

    except Exception as e:
        logger.exception("Failed to parse matches_df.csv")
        raise HTTPException(500, f"Failed to parse matches file: {e}")



@router.post(
    "/api/upload",
    tags=["Data Upload"],
    summary="Upload and visualize CSV data",
)
async def upload_csv(file: UploadFile = File(...)):
    """
    Upload a CSV file and return a simple auto-generated Plotly scatter.

    This is mainly for testing / demo; logic can be adapted as needed.
    """
    try:
        df = pd.read_csv(file.file)

        if "x" in df.columns and "y" in df.columns:
            fig = pd.DataFrame(df).pipe(
                lambda d: px.scatter(
                    d,
                    x="x",
                    y="y",
                    color=d.columns[2] if len(d.columns) > 2 else None,
                    title="Uploaded CSV Visualization",
                )
            )
        else:
            fig = px.scatter(
                df.reset_index(),
                x=df.columns[0],
                y=df.columns[1] if len(df.columns) > 1 else df.columns[0],
                title="Uploaded CSV Scatter (auto-generated)",
            )

        return JSONResponse(content=fig.to_dict())
    except Exception as e:
        logger.exception("Error processing uploaded CSV")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/team-logo/{team_name}", summary="Get team logo from S3")
async def get_team_logo(team_name: str):
    """
    Fetch team logo from S3. Tries {team_name}.png, then .svg, then .jpeg/.jpg
    Returns the image with appropriate Content-Type or 404 if not found.
    """
    extensions = [".png", ".svg", ".jpeg", ".jpg"]
    
    for ext in extensions:
        key = f"{team_name}{ext}"
        try:
            response = s3_client.get_object(Bucket=S3_BUCKET, Key=key)
            image_data = response['Body'].read()
            
            # Set appropriate Content-Type
            content_type = {
                ".png": "image/png",
                ".svg": "image/svg+xml",
                ".jpeg": "image/jpeg",
                ".jpg": "image/jpeg"
            }.get(ext, "application/octet-stream")
            
            return Response(content=image_data, media_type=content_type)
        except Exception as e:
            continue  # Try next extension
    
    # None found
    raise HTTPException(status_code=404, detail=f"Logo not found for team: {team_name}")
