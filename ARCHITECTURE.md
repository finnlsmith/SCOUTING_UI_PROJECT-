# System Design & Architecture

## Overview

Columbia MSDS Soccer Analytics is a full-stack web application for analyzing and visualizing Euro 2020 soccer match data. The system consists of three main components: a **React frontend**, a **FastAPI backend**, and **Jupyter notebooks** for exploratory data analysis.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Users                                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │     React Frontend (Port 3000)     │
        │  - Match Selection & Visualization │
        │  - Interactive Shot Maps           │
        │  - Passing Networks                │
        │  - Scoreboards                     │
        └──────────────┬─────────────────────┘
                       │ HTTP/REST API
                       │ (CORS enabled)
                       ▼
        ┌────────────────────────────────────┐
        │    FastAPI Backend (Port 8000)     │
        │  - REST API Endpoints              │
        │  - Business Logic                  │
        │  - Data Processing                 │
        └─────┬───────────────────┬──────────┘
              │                   │
              ▼                   ▼
    ┌─────────────────┐   ┌──────────────────┐
    │   Redis Cache   │   │   AWS S3         │
    │   (Upstash)     │   │   - Match Data   │
    │   - Fast Access │   │   - Events CSV   │
    │   - TTL Cache   │   │   - 360 Frames   │
    └─────────────────┘   └──────────────────┘
```

---

## Component Architecture

### 1. Frontend (React Application)

**Technology Stack:**
- **React 19.2** - UI framework
- **React Router 7.9** - Client-side routing
- **Plotly.js 3.1** - Interactive data visualizations
- **React-Plotly.js 2.6** - React wrapper for Plotly

**Architecture Pattern:**
- **Component-Based Architecture** with separation of concerns
- **Custom Hooks** for data fetching and state management
- **Lazy Loading** for code splitting and performance
- **Theme Context** for dark/light mode support

**Key Components:**

```
frontend/src/
├── App.js                    # Main app component with routing
├── components/
│   ├── Layout/              # App shell (sidebar, navigation)
│   ├── LandingPage/         # Homepage
│   ├── MatchViz/            # Main match visualization page
│   ├── MatchSelector/       # Match dropdown selector
│   ├── Scoreboard/          # Match statistics display
│   ├── ShotMapPlot/         # Plotly visualization component
│   ├── ShotMapButtons/      # Team filter buttons
│   ├── PassingNetworkButtons/ # Passing network controls
│   ├── ErrorBanner/         # Error display component
│   ├── ErrorBoundary/       # React error boundary
│   ├── AboutPage/           # About page
│   ├── ContactUs/           # Contact page
│   ├── TournamentsPage/     # Tournament selection
│   ├── ThemeToggle/         # Dark/light mode toggle
│   └── hooks/               # Custom React hooks
│       ├── useMatchData.js  # Fetch matches list
│       ├── useUpload.js     # Handle file uploads
│       └── useVisualization.js # Fetch visualizations
└── contexts/
    └── ThemeContext.js      # Global theme state
```

**Data Flow:**
1. User interacts with UI (selects match, filters by team)
2. Components call custom hooks (e.g., `useVisualization`)
3. Hooks make HTTP requests to backend API
4. Backend returns Plotly JSON figure data
5. `ShotMapPlot` component renders Plotly visualization

**API Communication:**
- Base URL configured via `REACT_APP_BACKEND_URL` environment variable
- All API calls use `fetch()` with async/await
- Error handling via ErrorBoundary and ErrorBanner components

---

### 2. Backend (FastAPI Application)

**Technology Stack:**
- **FastAPI 0.115** - Modern async web framework
- **Python 3.10+** - Programming language
- **Uvicorn 0.34** - ASGI server
- **Boto3 1.35** - AWS SDK for S3
- **Plotly 5.24** - Visualization generation
- **Pandas 2.3** - Data manipulation
- **Redis 5.0** - Caching layer

**Architecture Pattern:**
- **Modular Route-Based Architecture**
- **Separation of Concerns**: Routes → Business Logic → Data Access
- **Async/Await** throughout for non-blocking I/O
- **Caching Layer** for performance optimization

**Directory Structure:**

```
backend/
├── app.py                    # FastAPI app initialization
├── config/
│   └── settings.py          # Configuration (CORS, AWS, team colors)
├── routes/
│   ├── matches.py           # Match data endpoints
│   ├── visualizations.py    # Visualization endpoints
│   └── system.py            # System endpoints (health, errors)
├── models/
│   └── schemas.py           # Pydantic models for validation
├── visualizations/
│   ├── shot_map.py          # Shot map generation
│   ├── passing_network.py   # Passing network generation
│   ├── important_moments.py # Key moments extraction
│   ├── game_phases.py       # Match phase analysis
│   ├── possession_scene.py  # Possession sequence visualization
│   └── helpers.py           # Shared utilities
├── cache/
│   ├── __init__.py          # Auto-selects Redis or in-memory
│   ├── redis_cache.py       # Redis cache implementation
│   ├── core.py              # In-memory cache (fallback)
│   ├── s3_client.py         # Async S3 client with caching
│   └── config.py            # Cache configuration
└── utils/
    ├── coords.py            # Coordinate transformations
    └── pitch.py             # Pitch drawing utilities
```

**API Endpoints:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/matches` | GET | List available match files |
| `/api/match/{filename}/viz` | GET | Generate shot map visualization |
| `/api/match/{filename}/passing_network` | GET | Generate passing network |
| `/api/match/{filename}/important_moments` | GET | Extract key match moments |
| `/api/match/{filename}/game_phases` | GET | Analyze match phases |
| `/api/match/{filename}/possession_scene` | GET | Visualize possession sequence |
| `/api/upload` | POST | Upload CSV for visualization |
| `/api/client-error` | POST | Log client-side errors |

**Request Flow:**
1. FastAPI receives HTTP request
2. Route handler validates parameters
3. Check Redis cache for cached result
4. If cache miss, fetch data from S3
5. Process data (filter, transform, compute metrics)
6. Generate Plotly visualization
7. Store result in cache (TTL-based)
8. Return JSON response to frontend

---

### 3. Data Layer

**Storage:**
- **AWS S3** - Primary data storage
  - Bucket: `capstone-soccer-data` (configurable)
  - Region: `us-east-2` (configurable)
  - Files stored as CSV format

**Data Files:**
- `matches_df.csv` - Match metadata (one row per match)
- `lineups_df.csv` - Player lineups per match
- `events_<match_id>.csv` - Event-level data (passes, shots, etc.)
- `frames_360_<match_id>.csv` - StatsBomb 360 tracking frames

**Data Format:**
- **Coordinate System**: StatsBomb standard (120×80 pitch dimensions)
- **Origin**: Bottom-left corner (0, 0)
- **Locations**: JSON strings like `"[102.5, 35.2]"`

**Caching Strategy:**

```
┌─────────────────────────────────────────────────┐
│              Request Flow                        │
└─────────────────────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  Check Redis Cache    │
        └───────────┬───────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
    Cache HIT               Cache MISS
        │                       │
        ▼                       ▼
    Return Cached         Fetch from S3
    Data (fast!)               │
                          Process Data
                               │
                          Store in Cache
                               │
                          Return Response
```

**Cache Implementation:**
- **Primary**: Redis (Upstash) - Shared cache across instances
- **Fallback**: In-memory TTLCache - If Redis unavailable
- **TTL per cache type**:
  - `matches_df`: 15 minutes
  - `events_df`: 10 minutes
  - `plotly_viz`: 10 minutes
  - `important_moments`: 10 minutes
  - Default: 10 minutes

**Performance Impact:**
- **Response Time**: 89-92% improvement (430ms → 46ms average)
- **Throughput**: 9-14x increase (2.33 → 21.74 requests/second)
- **Cache Hit Rate**: 90%+ in production
- **Cost Savings**: ~80% reduction in S3 API calls

---

## Data Flow Architecture

### Frontend → Backend Flow

```
┌──────────────┐
│   React UI   │
└──────┬───────┘
       │ User selects match "Italy vs England"
       ▼
┌──────────────────────────────────────┐
│  useVisualization Hook               │
│  - loadMatchViz(matchFile)           │
└──────┬───────────────────────────────┘
       │ GET /api/match/events_3788741.csv/viz
       ▼
┌──────────────────────────────────────┐
│      FastAPI Backend                 │
│  - Route: /api/match/{filename}/viz  │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│      Cache Layer                     │
│  - Check Redis: "viz:3788741"        │
└──────┬───────────────────────────────┘
       │
   ┌───┴───┐
   │       │
  HIT     MISS
   │       │
   │       ▼
   │   ┌─────────────────────────┐
   │   │   S3 Client             │
   │   │   - Fetch events CSV    │
   │   │   - Fetch matches CSV   │
   │   └──────┬──────────────────┘
   │          │
   │          ▼
   │   ┌─────────────────────────┐
   │   │   Visualization Module  │
   │   │   - Filter shots        │
   │   │   - Compute xG          │
   │   │   - Generate Plotly     │
   │   └──────┬──────────────────┘
   │          │
   │          ▼
   │   ┌─────────────────────────┐
   │   │   Store in Cache        │
   │   └──────┬──────────────────┘
   │          │
   └──────────┴───────┐
                      │
                      ▼
              ┌───────────────┐
              │   JSON Response│
              │   Plotly Figure │
              └───────┬───────┘
                      │
                      ▼
              ┌───────────────┐
              │   React Renders│
              │   ShotMapPlot  │
              └───────────────┘
```

---

## Security & Configuration

### Environment Variables

**Backend (.env):**
```bash
AWS_REGION=us-east-2
S3_BUCKET_NAME=capstone-soccer-data
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
REDIS_URL=rediss://your-redis-url  # Optional, falls back to in-memory
```

**Frontend (.env):**
```bash
REACT_APP_BACKEND_URL=http://localhost:8000/api
```

### CORS Configuration
- Enabled for specific origins (localhost, Render production URLs)
- Credentials allowed for authenticated requests

### Authentication
- Currently no authentication required
- AWS credentials handled server-side
- Future: JWT or OAuth2 for user authentication

---

## Deployment Architecture

### Production Setup

**Backend:**
- **Platform**: Render.com
- **Runtime**: Python 3.10+
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
- **Environment**: Production with Redis cache enabled

**Frontend:**
- **Platform**: Render.com (Static Site)
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `build/`
- **Environment**: Production with backend URL configured

**Data:**
- **Storage**: AWS S3
- **Cache**: Upstash Redis (free tier: 64MB, 10K commands/day)

---

## Performance Optimizations

### Backend Optimizations

1. **Caching Layer**
   - Redis cache with 90%+ hit rate
   - TTL-based expiration for freshness
   - Automatic fallback to in-memory cache

2. **Async Operations**
   - All I/O operations are async (S3, cache)
   - Non-blocking request handling
   - Concurrent request processing

3. **Cache Warming**
   - Pre-load `matches_df.csv` on startup
   - Reduces first-request latency

4. **Data Processing**
   - Efficient pandas operations
   - Minimal data transformations
   - Optimized Plotly figure generation

### Frontend Optimizations

1. **Code Splitting**
   - Lazy loading of route components
   - Reduced initial bundle size

2. **Component Optimization**
   - Memoization where appropriate
   - Efficient re-rendering strategies

3. **API Calls**
   - Parallel requests for team-specific data
   - Error handling and retries

---

## Monitoring & Observability

### Current Monitoring
- FastAPI automatic OpenAPI docs (`/docs`)
- Cache statistics endpoint (`/api/cache/stats`)
- Client error logging (`/api/client-error`)

---

## Development Workflow

### Local Development

1. **Backend:**
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   uvicorn app:app --reload
   ```

2. **Frontend:**
   ```bash
   cd frontend
   npm install
   npm start
   ```

3. **Notebooks:**
   ```bash
   jupyter notebook
   ```

### Testing
- Backend: Unit tests in `cache/tests/`
- Frontend: React Testing Library setup
- API: Postman collection for endpoint testing

---
