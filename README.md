# Columbia-MSDS-F25-Soccer
Team repo for sharing capstone progress

A comprehensive soccer analytics platform with interactive notebooks, a FastAPI backend, and a React frontend for visualizing Euro 2020 match data.

---

## 🚀 Quick Links

- **[API Documentation](backend/API_DOCUMENTATION.md)** - Complete API reference with examples
- **[Interactive API Docs](http://localhost:8000/docs)** - Swagger UI (run backend first)
- **[API Spec (OpenAPI)](http://localhost:8000/openapi.json)** - Download OpenAPI 3.0 specification
- **[Postman Collection](backend/Soccer_Analytics_API.postman_collection.json)** - Import for API testing

---

## Overview

This repo contains three main components:

### 1. **Backend API** (`backend/`)
FastAPI-based REST API serving soccer analytics endpoints:
- Match data retrieval
- Shot maps and passing networks
- Game phase analysis
- Important moments extraction
- 360 tracking visualizations

**📖 [Full API Documentation →](backend/API_DOCUMENTATION.md)**

### 2. **Frontend Web App** (`frontend/`)
React-based interactive web application for visualizing match data.

### 3. **Jupyter Notebooks**
Exploratory data analysis notebooks:

1. **`initial_EDA.ipynb`** — Tournament-level EDA using:

   * `matches_df.csv` — one row per match (teams, score, date, etc.)
   * `lineups_df.csv` — player lineups per match (`match_id` is the join key)
   * Outputs: basic data health checks, lineup sanity, minutes/starts (if available), team/match summaries.

2. **`match_EDA.ipynb`** — Single-match analysis combining:

   * `events_<match_id>.csv` — on-ball event log (passes, shots, duels, etc.)
   * `frames_360_<match_id>.csv` — StatsBomb 360 freeze-frames (player locations around events)
   * Plots/metrics: FC-Python–style pitch maps (120×80), two-team shot map (home left / away right), progressive passes, passing network, field tilt, PPDA, nearest-defender distance on shots, freeze-frame visual.

> Coordinate system assumed: **StatsBomb 120 (length) × 80 (width)**.

---

## Repo contents

```
.
├─ initial_EDA.ipynb           # Tournament-level EDA (matches + lineups)
├─ match_EDA.ipynb             # Single-match EDA (events + 360 frames)
├─ requirements.txt            # Minimal dependencies for both notebooks
├─ lineups_df.csv              # Provided lineups (across matches)
├─ matches_df.csv              # Provided matches metadata
├─ events_by_match/            # (Optional) event CSVs named events_<match_id>.csv
├─ frames_360_by_match/        # (Optional) 360 CSVs named frames_360_<match_id>.csv
└─ README.md                   # This file
```

---

## Prerequisites

* **Python 3.10+** (3.11 works too)
* **Jupyter** (Notebook or Lab)

The code uses only widely available libraries (e.g., `pandas`, `numpy`, `matplotlib`). All are pinned in `requirements.txt`.

---

## Setup

### Backend Setup

1. **Create virtual environment and install dependencies:**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

pip install --upgrade pip
pip install -r requirements.txt
```

2. **Configure environment variables:**

```bash
# Copy the example file
cp .env.example .env

# Edit .env with your AWS credentials and CORS settings
# Required variables:
# AWS_REGION=us-east-2
# S3_BUCKET_NAME=your-bucket-name
# AWS_ACCESS_KEY_ID=your-key
# AWS_SECRET_ACCESS_KEY=your-secret
#
# CORS Configuration (comma-separated, no spaces after commas):
# For local development:
# CORS_ORIGINS=http://localhost:3000,http://localhost:5173
# For production, include your frontend URL:
# CORS_ORIGINS=https://your-frontend.com,http://localhost:3000
```

3. **Run the API server:**

```bash
uvicorn app:app --reload

# Server will start at http://localhost:8000
# Interactive docs at http://localhost:8000/docs
```

### Frontend Setup

1. **Install dependencies:**

```bash
cd frontend
npm install
```

2. **Configure environment variables:**

```bash
# Copy the example file
cp .env.example .env

# Edit .env with your backend URL
# For local development:
# REACT_APP_BACKEND_URL=http://localhost:8000/api
# For production:
# REACT_APP_BACKEND_URL=https://your-backend-api.com/api
# Note: REACT_APP_BACKEND_URL is required in production builds
```

3. **Start the development server:**

```bash
npm start

# App will start at http://localhost:3000
```

### Notebooks Setup

```bash
# From project root
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

pip install --upgrade pip
pip install -r requirements.txt

jupyter notebook
```

(Conda users can `conda create -n euro20 python=3.10` and then `pip install -r requirements.txt` inside the env.)

---

## Data layout

Place input files as follows (adjust if you store them differently):

```
lineups_df.csv
matches_df.csv
events_by_match/events_<match_id>.csv
frames_360_by_match/frames_360_<match_id>.csv
```

In `match_EDA.ipynb`, set the file paths near the top:

```python
MATCHES_CSV   = "matches_df.csv"
LINEUPS_CSV   = "lineups_df.csv"
EVENTS_CSV    = "events_by_match/events_3788741.csv"
FRAMES360_CSV = "frames_360_by_match/frames_360_3788741.csv"
```

> Make sure the **`<match_id>`** in the events and frames files matches; the notebooks join them by `id` (event UUID) and `match_id`.

---

## How to run

```bash
jupyter notebook
# or
jupyter lab
```

Then open:

1. **`initial_EDA.ipynb`**

   * Runs data sanity checks and high-level tournament summaries using `matches_df.csv` and `lineups_df.csv`.
   * Produces optional CSV outputs like `lineups_matches_merged.csv`, `player_summary.csv`, `team_summary.csv`.

2. **`match_EDA.ipynb`**

   * Analyzes a single match’s events + 360 frames.
   * Key visual choices:

     * FC-Python–style pitch drawing adapted to 120×80.
     * Shot map shows **both teams** on one pitch (home attacking **left**, away **right**).
   * Produces optional CSV outputs (e.g., `shots_xg_summary_<match_id>.csv`, `ppda_<match_id>.csv`, etc.).

---

## Reproduce for a different match

1. Drop the two files for your match into the expected folders:

   * `events_by_match/events_<YOUR_ID>.csv`
   * `frames_360_by_match/frames_360_<YOUR_ID>.csv`

2. Update the two path variables in `match_EDA.ipynb` to point to your `<YOUR_ID>`.

3. Run the notebook top-to-bottom.

   * All plots/metrics will update automatically for the new match.

---

## Notes & assumptions

* **StatsBomb pitch**: 120×80 is assumed for all coordinates and plots. If your sources differ, adjust the pitch helper accordingly.
* **Shot xG**: read from `shot_statsbomb_xg` if available. If absent, the notebook will still plot, but xG-based sizes default to zero.
* **Completed passes**: treated as `pass_outcome` **NaN** (StatsBomb convention).
* **PPDA**: implemented as a practical proxy (opponent passes / defensive actions in advanced zones). This is a heuristic; feel free to swap in your preferred definition.
* **Progressive passes**: pragmatic distance-toward-goal threshold; tweak as you like.

---

## API Usage

### Available Endpoints

The backend API provides 8 main endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/matches` | GET | List all available match files |
| `/api/match/{filename}/viz` | GET | Generate shot map visualization |
| `/api/match/{filename}/passing_network` | GET | Generate passing network |
| `/api/match/{filename}/important_moments` | GET | Extract key match moments |
| `/api/match/{filename}/game_phases` | GET | Analyze match phases |
| `/api/match/{filename}/possession_scene` | GET | Visualize possession sequence |
| `/api/upload` | POST | Upload and visualize CSV |
| `/api/client-error` | POST | Log client errors |

### Quick Example

```python
import requests

# Get available matches
matches = requests.get('http://localhost:8000/api/matches').json()

# Get shot map for Italy vs England final
shot_map = requests.get(
    'http://localhost:8000/api/match/events_3788741.csv/viz',
    params={'team': 'Italy'}
).json()

# Get important moments
moments = requests.get(
    'http://localhost:8000/api/match/events_3788741.csv/important_moments'
).json()
```

### Testing with Postman

1. Import the collection: `backend/Soccer_Analytics_API.postman_collection.json`
2. Set the `base_url` variable to `http://localhost:8000`
3. Run requests to test all endpoints

**📖 [Complete API Documentation →](backend/API_DOCUMENTATION.md)**

---

## Attribution

* Pitch drawing style inspired by **FC Python's Matplotlib pitch** approach, adapted to StatsBomb 120×80.
* Concepts referenced from common football analytics practice (xG maps, passing networks, PPDA, field tilt, progressive passes).
