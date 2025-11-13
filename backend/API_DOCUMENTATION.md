# Columbia MSDS Soccer Analytics API Documentation

## Overview

The Soccer Analytics API provides comprehensive endpoints for analyzing Euro 2020 match data using StatsBomb event and tracking data. The API offers visualization endpoints, match analytics, and tactical insights.

**Base URL (Local):** `http://localhost:8000`  
**Base URL (Production):** `https://columbia-msds-f25-soccer.onrender.com`

**API Version:** v1  
**Interactive Docs:** `/docs` (Swagger UI) or `/redoc` (ReDoc)  
**OpenAPI Spec:** `/openapi.json`

---

## Authentication

Currently, no authentication is required. AWS credentials are handled server-side.

---

## Endpoints

### System Endpoints

#### POST `/api/client-error`
Log client-side JavaScript errors for debugging.

**Request Body:**
```json
{
  "message": "Cannot read property 'x' of undefined",
  "stack": "Error: Cannot read property...",
  "componentStack": "    in ErrorComponent...",
  "url": "https://example.com/match/123",
  "userAgent": "Mozilla/5.0...",
  "time": "2024-01-15T10:30:00.000Z"
}
```

**Response:**
```json
{
  "status": "ok"
}
```

---

### Match Data Endpoints

#### GET `/api/matches`
Retrieve list of all available match files.

**Response:**
```json
[
  {
    "file": "events_3788741.csv",
    "label": "2021-07-11 - Italy vs England – Events"
  },
  {
    "file": "frames_360_3788741.csv",
    "label": "2021-07-11 - Italy vs England – Frames 360"
  }
]
```

**Example:**
```bash
curl http://localhost:8000/api/matches
```

---

### Visualization Endpoints

#### GET `/api/match/{filename}/viz`
Generate interactive shot map visualization.

**Path Parameters:**
- `filename` (string, required): S3 key of events file (e.g., `events_3788741.csv`)

**Query Parameters:**
- `team` (string, optional): Filter by specific team name

**Example Request:**
```bash
# All shots
curl "http://localhost:8000/api/match/events_3788741.csv/viz"

# Italy shots only
curl "http://localhost:8000/api/match/events_3788741.csv/viz?team=Italy"
```

**Response:** Plotly figure JSON with shot locations, xG values, and pitch markings.

```json
{
  "data": [
    {
      "type": "scatter",
      "x": [102.5, 98.3, ...],
      "y": [35.2, 42.1, ...],
      "marker": {
        "size": [8.5, 12.3, ...],
        "color": "#007FFF"
      }
    }
  ],
  "layout": {
    "title": {"text": "Italy 1-1 England | Shots: 20 (6 on target)"},
    "shapes": [...]
  },
  "meta": {
    "total_shots": 20,
    "shots_on_target": 6,
    "goals": 1,
    "total_xg": 1.45
  }
}
```

---

#### GET `/api/match/{filename}/passing_network`
Generate passing network visualization for a team.

**Path Parameters:**
- `filename` (string, required): Events file

**Query Parameters:**
- `team` (string, required): Team name
- `min_passes` (integer, optional, default=1): Minimum passes between players
- `flip` (boolean, optional, default=false): Flip pitch horizontally

**Example Request:**
```bash
curl "http://localhost:8000/api/match/events_3788741.csv/passing_network?team=Italy&min_passes=3"
```

**Response:** Plotly figure with nodes (players) and edges (passes).

```json
{
  "data": [...],
  "layout": {
    "title": {"text": "Italy Passing Network - Starting XI"}
  },
  "team": "Italy",
  "node_count": 11,
  "edge_count": 28,
  "min_passes": 3,
  "starting_xi_filter_applied": true
}
```

---

#### GET `/api/match/{filename}/possession_scene`
Generate detailed possession sequence visualization with player tracking.

**Path Parameters:**
- `filename` (string, required): Events file

**Query Parameters:**
- `possession` (integer, required): Possession number to visualize

**Example Request:**
```bash
curl "http://localhost:8000/api/match/events_3788741.csv/possession_scene?possession=42"
```

**Response:** PNG image (base64 encoded or binary)

**Note:** Requires corresponding `frames_360_{match_id}.csv` file.

---

### Analytics Endpoints

#### GET `/api/match/{filename}/important_moments`
Extract key moments from a match.

**Path Parameters:**
- `filename` (string, required): Events file

**Example Request:**
```bash
curl "http://localhost:8000/api/match/events_3788741.csv/important_moments"
```

**Response:**
```json
[
  {
    "who": "H. Kane",
    "when": "23:45",
    "event_type": "Shot",
    "outcome": "Goal",
    "xg": 0.324,
    "team": "England",
    "possession": 123,
    "original_row": 456
  },
  {
    "who": "L. Bonucci",
    "when": "67:12",
    "event_type": "Shot",
    "outcome": "Goal",
    "xg": 0.089,
    "team": "Italy",
    "possession": 287,
    "original_row": 892
  }
]
```

**Filtering Criteria:**
- Shots with xG ≥ 0.08 OR outcome = Goal
- All own goals
- Penalty-winning fouls
- Events before 120:00 (excludes penalty shootout)

---

#### GET `/api/match/{filename}/game_phases`
Analyze match divided into tactical phases.

**Path Parameters:**
- `filename` (string, required): Events file

**Example Request:**
```bash
curl "http://localhost:8000/api/match/events_3788741.csv/game_phases"
```

**Response:**
```json
{
  "phases": [
    {
      "phase_id": 1,
      "start_event": 0,
      "end_event": 245,
      "trigger": "Match Start",
      "minute": "0:00",
      "score_home": 0,
      "score_away": 0
    },
    {
      "phase_id": 2,
      "start_event": 246,
      "end_event": 512,
      "trigger": "Goal - England (H. Kane)",
      "minute": "23:45",
      "score_home": 1,
      "score_away": 0
    }
  ],
  "phase_metrics": [
    {
      "phase_id": 1,
      "home_possession": 48.5,
      "away_possession": 51.5,
      "home_shots": 3,
      "away_shots": 4,
      "home_box_entries": 12,
      "away_box_entries": 15,
      "home_final_third_entries": 28,
      "away_final_third_entries": 32
    }
  ]
}
```

**Phase Triggers:**
- Match start
- Goals (including own goals)
- Half-time
- Red cards
- Extra time periods

---

### Data Upload Endpoints

#### POST `/api/upload`
Upload CSV file for quick visualization.

**Request:**
- Content-Type: `multipart/form-data`
- Body: CSV file

**Example (using curl):**
```bash
curl -X POST \
  -F "file=@/path/to/data.csv" \
  http://localhost:8000/api/upload
```

**Example (using Python):**
```python
import requests

with open('data.csv', 'rb') as f:
    response = requests.post(
        'http://localhost:8000/api/upload',
        files={'file': f}
    )
    
figure_data = response.json()
```

**Response:** Plotly figure JSON

---

## Error Responses

All endpoints return errors in a consistent format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (missing columns, invalid parameters)
- `404` - Not Found (file doesn't exist, no data available)
- `500` - Internal Server Error (processing failed)

---

## Data Format

### StatsBomb Coordinates
All spatial data uses StatsBomb's coordinate system:
- **Pitch dimensions:** 120 (length) × 80 (width)
- **Origin:** Bottom-left corner (0, 0)
- **Units:** Arbitrary StatsBomb units

### Location Format
Locations are stored as JSON strings:
```json
"[102.5, 35.2]"
```

Convert to coordinates:
```python
import json
location = json.loads(location_string)
x, y = location[0], location[1]
```

---

## Rate Limiting

Currently no rate limits are enforced. For production use, consider implementing rate limiting.

---

## Examples

### Python Example
```python
import requests
import plotly.graph_objects as go

# Get available matches
matches = requests.get('http://localhost:8000/api/matches').json()
print(f"Found {len(matches)} match files")

# Get shot map for a specific match
filename = 'events_3788741.csv'
shot_map = requests.get(
    f'http://localhost:8000/api/match/{filename}/viz',
    params={'team': 'Italy'}
).json()

# Render with Plotly
fig = go.Figure(shot_map)
fig.show()
```

### JavaScript Example
```javascript
// Fetch match list
fetch('http://localhost:8000/api/matches')
  .then(res => res.json())
  .then(matches => {
    console.log(`Found ${matches.length} matches`);
  });

// Get important moments
fetch('http://localhost:8000/api/match/events_3788741.csv/important_moments')
  .then(res => res.json())
  .then(moments => {
    moments.forEach(m => {
      console.log(`${m.when} - ${m.who}: ${m.outcome} (xG: ${m.xg})`);
    });
  });
```

---

## Support

For issues, questions, or feature requests:
- **Email:** support@example.com
- **GitHub:** [Repository Link]
- **Interactive Docs:** Visit `/docs` for live API testing

---

## Version History

### v1 (Current)
- Initial API release
- 8 endpoints covering match data, visualizations, and analytics
- StatsBomb Euro 2020 data support
- Interactive documentation

