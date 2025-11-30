# Redis Cache Setup Guide

Complete guide to set up and use the Redis caching system for the Soccer Analytics API.

**Note:** We initially implemented an in-memory cache as a proof of concept, which validated the caching strategy with 98%+ performance improvements. We then migrated to Redis for production scalability and shared cache across instances.

---

## Quick Overview

The system uses **Redis (Upstash)** for caching, with automatic fallback to in-memory cache if Redis is unavailable.

---

## Prerequisites

- Python 3.9+
- Upstash Redis account (free tier: 64 MB, 10K commands/day)
- AWS credentials for S3 access

---

## Step 1: Set Up Upstash Redis

1. Sign up at [upstash.com](https://upstash.com)
2. Create a new Redis database
3. Copy the **TCP URL** (starts with `rediss://`)
4. Add to `backend/.env`:

```bash
REDIS_URL="rediss://default:YOUR_TOKEN@YOUR_HOST:6379"
```

---

## Step 2: Install Dependencies

```bash
cd backend
source ../venv-backend/bin/activate
pip install -r requirements.txt
```

Required packages: `redis`, `hiredis`, `cachetools`, `aioboto3`, `python-dotenv`

---

## Step 3: Verify Redis Connection

```bash
python cache/test_redis_connection.py
```

Expected output: `✅ All Redis connection tests passed!`

---

## Step 4: Start the Server

```bash
uvicorn app:app --reload
```

The system will automatically:
- Connect to Redis if `REDIS_URL` is set
- Fall back to in-memory cache if Redis unavailable
- Log which backend is being used

---

## Step 5: Verify It's Working

```bash
# Check cache stats (should show "backend": "redis")
curl http://localhost:8000/api/cache/stats

# Test endpoint (first call - cache miss)
time curl http://localhost:8000/api/matches

# Test again (second call - cache hit, should be ~90% faster)
time curl http://localhost:8000/api/matches
```

---

## Cache Configuration

TTL values are configured in `cache/config.py`:

- `matches_df`: 15 minutes
- `events_df`: 10 minutes
- `plotly_viz`: 10 minutes
- `possession_scene`: 5 minutes
- `default`: 10 minutes

---

## Monitoring

**Check cache stats:**
```bash
curl http://localhost:8000/api/cache/stats
```

Returns:
```json
{
  "backend": "redis",
  "hits": 45,
  "misses": 12,
  "hit_rate": 78.95,
  "memory_used_mb": 0.5,
  "memory_max_mb": 64.0,
  "memory_usage_percent": 0.78
}
```

**Clear cache:**
```bash
curl -X POST http://localhost:8000/api/cache/clear
```

---

## Troubleshooting

**Redis connection fails:**
- Check `REDIS_URL` in `.env` file
- Verify Upstash database is running
- Test connection: `python cache/test_redis_connection.py`

**Falls back to in-memory:**
- Check server logs for Redis connection errors
- Verify `REDIS_URL` is set correctly
- System will work with in-memory fallback

**Memory limit warnings:**
- Upstash free tier: 64 MB limit
- Monitor via `/api/cache/stats`
- Clear cache if needed: `POST /api/cache/clear`

---

## Performance

Expected improvements with Redis:
- **89-92% faster** response times (430ms → 35-46ms)
- **9-14x speedup** for cached requests
- **90%+ cache hit rate** in production
- **50-60x throughput increase**

See `REDIS_PERFORMANCE_METRICS.md` for detailed results.

---

## Architecture Notes

- **Serialization:** JSON for simple types, Pickle for DataFrames
- **TTL:** Per-key TTL support (better than in-memory)
- **Persistence:** Cache survives server restarts
- **Multi-instance:** Shared cache across all API instances
- **Fallback:** Automatic fallback to in-memory if Redis unavailable

---

**That's it! Your Redis cache is ready to use.** 🚀

