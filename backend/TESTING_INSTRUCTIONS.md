# Testing Cache Performance on Localhost

## Quick Start

### Step 1: Install Dependencies (if needed)

```bash
cd backend
# Activate your virtual environment if you have one
# source ../.venv/bin/activate  # or source .venv/bin/activate if venv is in backend/

pip install -r ../requirements.txt  # Use root requirements.txt (canonical)
```

### Step 2: Start the Server

Open a terminal and run:

```bash
cd backend
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
🔥 Starting cache warmup...
✅ Cache warmed: matches_df.csv
✅ Cache warmup complete
```

### Step 3: Test Performance

**Option A: Using the test script (recommended)**

Open a **new terminal** and run:

```bash
cd backend
chmod +x start_and_test.sh
./start_and_test.sh
```

**Option B: Manual testing with curl**

```bash
# First request (cache miss - slow)
time curl http://localhost:8000/api/matches

# Wait a moment, then second request (cache hit - fast)
time curl http://localhost:8000/api/matches

# Check cache stats
curl http://localhost:8000/api/cache/stats | python3 -m json.tool
```

**Option C: Using Python test script**

```bash
cd backend
python3 test_performance.py
```

## What to Look For

### ✅ Success Indicators:

1. **First Request (Cache MISS):**
   - Takes 2-5 seconds (depends on S3 speed)
   - Logs show: `❌ Cache MISS: api:matches:list`

2. **Second Request (Cache HIT):**
   - Takes <0.5 seconds (much faster!)
   - Logs show: `✅ Cache HIT: api:matches:list`
   - **Should be 50-90% faster than first request**

3. **Cache Stats:**
   ```json
   {
     "backend": "memory",
     "hits": 1,
     "misses": 1,
     "hit_rate": 50.0,
     "size": 2,
     "maxsize": 1000
   }
   ```

### Expected Performance:

- **First call:** 2-5 seconds (cache miss)
- **Second call:** 0.1-0.5 seconds (cache hit)
- **Improvement:** 50-90% faster
- **Hit rate:** Should increase with more requests

## Testing Other Endpoints

Once you have a match file, you can test other endpoints:

```bash
# Replace events_3788741.csv with an actual match file
MATCH_FILE="events_3788741.csv"

# Test visualization endpoint
time curl "http://localhost:8000/api/match/${MATCH_FILE}/viz"
time curl "http://localhost:8000/api/match/${MATCH_FILE}/viz"  # Second call should be faster

# Test important moments
time curl "http://localhost:8000/api/match/${MATCH_FILE}/important_moments"
time curl "http://localhost:8000/api/match/${MATCH_FILE}/important_moments"  # Faster!

# Test game phases
time curl "http://localhost:8000/api/match/${MATCH_FILE}/game_phases"
time curl "http://localhost:8000/api/match/${MATCH_FILE}/game_phases"  # Faster!
```

## Troubleshooting

### Server won't start:
- Check if port 8000 is already in use: `lsof -i :8000`
- Make sure all dependencies are installed: `pip install -r ../requirements.txt` (from backend/) or `pip install -r requirements.txt` (from root)
- Check for syntax errors: `python3 -m py_compile app.py`

### No performance improvement:
- Check logs for "Cache HIT" / "Cache MISS" messages
- Verify cache stats show hits increasing
- Make sure you're testing the same endpoint twice

### Cache stats not showing:
- Make sure `/api/cache/stats` endpoint is accessible
- Check server logs for errors
- Verify cache module loaded: Look for "✅ In-memory cache initialized" in logs

## Monitoring Cache Performance

Watch the server logs in real-time:

```bash
# In the server terminal, you should see:
❌ Cache MISS: api:matches:list
📥 Loaded and cached: matches_df.csv
✅ Cache HIT: api:matches:list
```

Check cache stats anytime:
```bash
curl http://localhost:8000/api/cache/stats
```

