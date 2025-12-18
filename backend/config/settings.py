# config/settings.py

import os
import boto3

# -----------------------------
# Load environment variables
# -----------------------------
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # python-dotenv not installed, try to load .env manually.
    # We assume .env lives in the project root (same folder as app.py).
    base_dir = os.path.dirname(os.path.dirname(__file__))
    env_path = os.path.join(base_dir, ".env")
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ[key.strip()] = value.strip()


# -----------------------------
# API metadata
# -----------------------------
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


# -----------------------------
# CORS configuration
# -----------------------------
# CORS_ORIGINS can be set via environment variable as comma-separated list
# Example: CORS_ORIGINS=https://example.com,http://localhost:3000,http://localhost:5173
_cors_origins_env = os.getenv("CORS_ORIGINS", "").strip()
if _cors_origins_env:
    # Parse comma-separated origins from environment variable
    CORS_ORIGINS = [origin.strip() for origin in _cors_origins_env.split(",") if origin.strip()]
else:
    # Fallback to default origins for local development
    # In production, CORS_ORIGINS should always be set via environment variable
    # Check if we're in production (common indicators)
    is_production = (
        os.getenv("RENDER") is not None or  # Render.com
        os.getenv("DYNO") is not None or    # Heroku
        os.getenv("FLY_APP_NAME") is not None or  # Fly.io
        os.getenv("VERCEL") is not None or  # Vercel
        os.getenv("ENVIRONMENT", "").lower() == "production"
    )
    
    if is_production:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(
            "⚠️  CORS_ORIGINS environment variable not set in production. "
            "Using default origins. Please set CORS_ORIGINS for production deployment."
        )
    
    CORS_ORIGINS = [
        "https://columbia-msds-f25-soccer-frontend.onrender.com",
        "https://columbia-msds-f25-soccer.onrender.com",
        "http://localhost:3000",
        "http://localhost:5173",
    ]


# -----------------------------
# AWS / S3 configuration
# -----------------------------
AWS_REGION = os.getenv("AWS_REGION", "us-east-2")
S3_BUCKET = os.getenv("S3_BUCKET_NAME", "capstone-soccer-data")

s3_client = boto3.client(
    "s3",
    region_name=AWS_REGION,
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
)


# -----------------------------
# Team colors
# -----------------------------
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
    "Estonia": "#4891D9",
    "Faroe Islands": "#3F5BA9",
    "Finland": "#003580",
    "France": "#0055A4",
    "Georgia": "#FF0000",
    "Germany": "#000000",
    "Gibraltar": "#DA1212",
    "Greece": "#0D5EAF",
    "Hungary": "#CE2939",
    "Iceland": "#003897",
    "Ireland": "#169B62",
    "Israel": "#0038B8",
    "Italy": "#008C45",
    "Kazakhstan": "#00AFCA",
    "Kosovo": "#244AA5",
    "Latvia": "#9D2235",
    "Liechtenstein": "#002B7F",
    "Lithuania": "#FDB913",
    "Luxembourg": "#00A3E0",
    "Malta": "#CF142B",
    "Moldova": "#0033A1",
    "Montenegro": "#D2232A",
    "Netherlands": "#FF4B00",
    "North Macedonia": "#D20000",
    "Northern Ireland": "#0055A4",
    "Norway": "#BA0C2F",
    "Poland": "#DC143C",
    "Portugal": "#006600",
    "Romania": "#002B7F",
    "Russia": "#D52B1E",
    "San Marino": "#5EB6E4",
    "Scotland": "#0033A0",
    "Spain": "#C60B1E",
    "Sweden": "#FFEC00",
    "Switzerland": "#FF0000",
    "Turkey": "#E30A17",
    "Ukraine": "#FFE000",
    "Wales": "#D80000",
}
