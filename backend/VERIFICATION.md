# API Documentation Verification Guide

This guide helps you verify that all API documentation features are working correctly.

## Prerequisites

1. Backend server must be running
2. Environment variables configured (`.env` file with AWS credentials)

## Start the Server

```bash
cd backend
source .venv/bin/activate  # or activate your virtual environment
uvicorn app:app --reload
```

The server should start at `http://localhost:8000`

---

## Verification Checklist

### ✅ 1. Interactive API Documentation (Swagger UI)

**URL:** http://localhost:8000/docs

**What to Check:**
- [ ] Page loads without errors
- [ ] All 8 endpoints are listed and organized by tags:
  - System (1 endpoint)
  - Matches (1 endpoint)
  - Match Visualizations (3 endpoints)
  - Match Analytics (2 endpoints)
  - Data Upload (1 endpoint)
- [ ] Each endpoint shows:
  - Complete description with examples
  - Parameter descriptions
  - Request/response schemas
  - "Try it out" button works
- [ ] API title shows: "Columbia MSDS Soccer Analytics API"
- [ ] API version shows: "v1"
- [ ] API description is visible with features list

**Test It:**
1. Click on `GET /api/matches`
2. Click "Try it out"
3. Click "Execute"
4. Verify you get a 200 response with match data

---

### ✅ 2. Alternative Documentation (ReDoc)

**URL:** http://localhost:8000/redoc

**What to Check:**
- [ ] Page loads with three-panel layout
- [ ] Left sidebar shows all endpoints
- [ ] Middle panel shows selected endpoint details
- [ ] Right panel shows request/response examples
- [ ] Search functionality works
- [ ] Download spec button present

---

### ✅ 3. OpenAPI Specification

**URL:** http://localhost:8000/openapi.json

**What to Check:**
- [ ] Returns valid JSON (not HTML error page)
- [ ] Contains `openapi: "3.x.x"`
- [ ] Contains `info` section with title, description, version
- [ ] Contains `paths` object with all 8 endpoints
- [ ] Each endpoint has:
  - `summary`
  - `description`
  - `parameters` (where applicable)
  - `responses`
  - `tags`

**Test It:**
```bash
curl http://localhost:8000/openapi.json | jq '.info'
```

Expected output:
```json
{
  "title": "Columbia MSDS Soccer Analytics API",
  "description": "## Soccer Analytics API...",
  "version": "v1",
  "contact": {...},
  "license": {...}
}
```

---

### ✅ 4. All Endpoints Have Docstrings

**Check in `/docs`:**

For each endpoint, verify the description includes:
- [ ] Clear summary of what the endpoint does
- [ ] Parameter descriptions
- [ ] Example request/response
- [ ] Notes about data requirements
- [ ] Error cases

**Endpoints to Check:**
1. `POST /api/client-error` - ✅ Logs client errors
2. `GET /api/matches` - ✅ Lists all matches
3. `POST /api/upload` - ✅ CSV upload
4. `GET /api/match/{filename}/viz` - ✅ Shot map with team filter
5. `GET /api/match/{filename}/passing_network` - ✅ Network with params
6. `GET /api/match/{filename}/important_moments` - ✅ Key moments
7. `GET /api/match/{filename}/game_phases` - ✅ Phase analysis
8. `GET /api/match/{filename}/possession_scene` - ✅ 360 visualization

---

### ✅ 5. Environment Variables Documented

**File:** `backend/.env.example`

**Check:**
- [ ] File exists
- [ ] All required variables documented:
  - `AWS_REGION`
  - `S3_BUCKET_NAME`
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
- [ ] Each variable has a comment explaining its purpose
- [ ] Optional variables clearly marked
- [ ] Notes about security included

---

### ✅ 6. Postman Collection

**File:** `backend/Soccer_Analytics_API.postman_collection.json`

**Check:**
- [ ] File exists and is valid JSON
- [ ] Import into Postman succeeds
- [ ] Collection contains all 8+ requests organized by folders
- [ ] Variables are pre-configured:
  - `base_url` = `http://localhost:8000`
  - `sample_match_file` = `events_3788741.csv`
- [ ] Each request has a description

**Test in Postman:**
1. Import the collection
2. Run "List All Matches" request
3. Verify 200 response with match data
4. Run "Shot Map - Single Team" request
5. Verify Plotly figure JSON response

---

### ✅ 7. API Documentation File

**File:** `backend/API_DOCUMENTATION.md`

**Check:**
- [ ] File exists
- [ ] Contains overview section
- [ ] All 8 endpoints documented with:
  - Method and path
  - Parameters
  - Example requests (curl, Python, JavaScript)
  - Example responses
  - Error codes
- [ ] Data format section explains StatsBomb coordinates
- [ ] Usage examples provided
- [ ] Support/contact information included

---

### ✅ 8. README Links

**File:** `README.md`

**Check at top of file:**
- [ ] Quick Links section exists with:
  - Link to `backend/API_DOCUMENTATION.md`
  - Link to `/docs` (localhost)
  - Link to `/openapi.json` (localhost)
  - Link to Postman collection
- [ ] Backend setup instructions include:
  - Environment variable configuration
  - How to start the server
  - Port information
- [ ] API Usage section with:
  - Table of endpoints
  - Quick example code
  - Postman instructions

---

## Manual Testing

### Test Each Endpoint

Run these curl commands to verify endpoints work:

```bash
# 1. List matches
curl http://localhost:8000/api/matches

# 2. Shot map
curl "http://localhost:8000/api/match/events_3788741.csv/viz?team=Italy"

# 3. Important moments
curl http://localhost:8000/api/match/events_3788741.csv/important_moments

# 4. Game phases
curl http://localhost:8000/api/match/events_3788741.csv/game_phases

# 5. Passing network (requires team param)
curl "http://localhost:8000/api/match/events_3788741.csv/passing_network?team=Italy"

# 6. OpenAPI spec
curl http://localhost:8000/openapi.json
```

---

## Browser Testing

Test in multiple browsers to ensure compatibility:

- [ ] Chrome - Visit `/docs` and `/redoc`
- [ ] Firefox - Visit `/docs` and `/redoc`
- [ ] Safari - Visit `/docs` and `/redoc`
- [ ] Edge - Visit `/docs` and `/redoc`

All should display correctly without JavaScript errors.

---

## Acceptance Criteria Summary

✅ **All endpoints have complete docstrings** - Verified in `/docs`  
✅ **OpenAPI spec available** - Accessible at `/openapi.json`  
✅ **Interactive docs available** - Accessible at `/docs` and `/redoc`  
✅ **.env.example created** - File exists with all variables  
✅ **Postman collection exported** - JSON file ready for import  
✅ **README includes links** - Quick links section at top  
✅ **Examples work in browsers** - Test in Chrome/Firefox/Safari/Edge  

---

## Troubleshooting

### Server won't start
- Check `.env` file exists and has valid AWS credentials
- Verify all dependencies installed: `pip install -r requirements.txt` (from root) or `pip install -r ../requirements.txt` (from backend/)
- Check port 8000 isn't already in use: `lsof -i :8000`

### /docs returns 404
- Confirm you're using correct URL: `http://localhost:8000/docs`
- Check FastAPI configuration in `app.py` has `docs_url="/docs"`
- Look for errors in terminal where server is running

### Endpoints return 500 errors
- Check AWS credentials are valid
- Verify S3 bucket name is correct
- Check S3 bucket has the required CSV files
- Review server logs for detailed error messages

### Postman collection won't import
- Verify JSON file is valid
- Try opening file in text editor to check for corruption
- Re-download from repository if needed

---

## Next Steps

After verification:
1. ✅ Commit all documentation files
2. ✅ Push to repository
3. ✅ Share `/docs` link with team
4. ✅ Import Postman collection for QA testing
5. ✅ Update production URLs in documentation when deployed

