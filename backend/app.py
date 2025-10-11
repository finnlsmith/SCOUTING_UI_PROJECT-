from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import plotly.express as px

app = FastAPI()

# Allow React frontend (port 3000 or 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, use specific domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
