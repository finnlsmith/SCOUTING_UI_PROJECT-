# Columbia-MSDS-F25-Soccer
Team repo for sharing capstone progress

A tiny guide to what’s here, what the notebooks do, and how to reproduce the results end-to-end. Will keep updating as I go.

---

## Overview

This repo contains two complementary analyses:

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

Create and activate a virtual environment, then install dependencies:

```bash
# using venv
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

pip install --upgrade pip
pip install -r requirements.txt
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

## Attribution

* Pitch drawing style inspired by **FC Python’s Matplotlib pitch** approach, adapted to StatsBomb 120×80.
* Concepts referenced from common football analytics practice (xG maps, passing networks, PPDA, field tilt, progressive passes).
