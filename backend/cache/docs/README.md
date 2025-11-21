# Cache System Documentation

Redis caching system for the Soccer Analytics API.

**Current Implementation:** Redis (Upstash) with automatic fallback to in-memory cache.

**Note:** We initially implemented an in-memory cache as a proof of concept, which validated the caching strategy with 98%+ performance improvements. We then migrated to Redis for production scalability, shared cache across instances, and persistence.

---

## Quick Start

👉 **[REDIS_QUICK_START.md](./REDIS_QUICK_START.md)** - Get started in 3 minutes

---

## Documentation Files

| File | Description |
|------|-------------|
| **REDIS_QUICK_START.md** | 3-minute setup guide |
| **REDIS_SETUP_GUIDE.md** | Complete Redis setup and configuration |
| **REDIS_PERFORMANCE_METRICS.md** | Performance test results and metrics |

---

## Current Setup

- **Backend:** Redis (Upstash)
- **Fallback:** In-memory cache (if Redis unavailable)
- **Performance:** 89-92% improvement, 9-14x speedup
- **Hit Rate:** 90%+
- **Memory:** 64 MB limit (Upstash free tier)

---

## Quick Commands

```bash
# Check cache stats
curl http://localhost:8000/api/cache/stats

# Clear cache
curl -X POST http://localhost:8000/api/cache/clear

# Test Redis connection
python cache/test_redis_connection.py
```

---

## Performance

- **Response time:** 89-92% faster (430ms → 35-46ms)
- **Throughput:** 50-60x increase (2 req/s → 100+ req/s)
- **Cache hit rate:** 90%+
- **S3 calls reduced:** ~90%

See `REDIS_PERFORMANCE_METRICS.md` for detailed results.

---

## Architecture

- **Serialization:** JSON (simple types) + Pickle (DataFrames)
- **TTL:** Per-key expiration (5-15 minutes)
- **Persistence:** Cache survives restarts
- **Multi-instance:** Shared cache across all API instances

---

**For detailed setup instructions, see [REDIS_SETUP_GUIDE.md](./REDIS_SETUP_GUIDE.md)**

