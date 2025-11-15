# Cache Module

This module provides intelligent caching for the Soccer Analytics API, reducing S3 calls and improving response times.

## Overview

The cache system implements **in-memory TTL (Time-To-Live) caching** using `cachetools.TTLCache` to store frequently accessed data and computed visualizations. This dramatically improves API response times and reduces AWS S3 costs by avoiding redundant data fetches.

## Type of Caching

### Implementation: In-Memory TTL Cache

We implemented **in-memory caching with automatic expiration** using:
- **Library:** `cachetools.TTLCache` (Python)
- **Storage:** In-process memory (fast, no network overhead)
- **Expiration:** Time-based (TTL) - items automatically expire after configured time
- **Size Limit:** 1000 items maximum (LRU eviction when full)
- **Backend:** Single-process memory (designed for easy Redis migration)

### Why This Approach?

1. **Fast Access:** In-memory is the fastest caching option (microsecond access times)
2. **Simple Setup:** No external dependencies (Redis, Memcached) required
3. **Automatic Expiration:** TTL ensures data freshness without manual invalidation
4. **Cost Effective:** No additional infrastructure costs
5. **Easy Migration Path:** Interface designed to swap in Redis later for multi-instance deployments

## How We Implemented It

### Architecture

```
┌─────────────┐
│   FastAPI   │
│   Endpoints │
└──────┬──────┘
       │
       ▼
┌─────────────┐      ┌──────────────┐
│  Cache      │◄─────┤  S3 Client    │
│  (TTLCache) │      │  (aioboto3)   │
└─────────────┘      └──────┬───────┘
       │                     │
       │                     ▼
       │              ┌─────────────┐
       │              │   AWS S3    │
       │              └─────────────┘
       │
       ▼
┌─────────────┐
│   Response  │
└─────────────┘
```

### Key Components

1. **Cache Core (`core.py`)**
   - `InMemoryCache` class wrapping `TTLCache`
   - Hit/miss metrics tracking
   - Automatic TTL expiration
   - LRU eviction when cache is full

2. **S3 Client (`s3_client.py`)**
   - Async S3 operations using `aioboto3`
   - Built-in cache integration
   - Automatic DataFrame caching
   - Timeout protection

3. **Configuration (`config.py`)**
   - TTL settings per cache type
   - Different expiration times for different data types
   - Configurable cache size

4. **Integration (`app.py`)**
   - Cache checks before S3 calls
   - Cache storage after S3 fetches
   - Cache warming on startup
   - Cache statistics endpoint

### Implementation Details

**Cache Flow:**
1. API endpoint receives request
2. Check cache for key (e.g., `s3:df:matches_df.csv`)
3. **Cache HIT:** Return cached data immediately (fast!)
4. **Cache MISS:** Fetch from S3, process, store in cache, return data
5. Subsequent requests use cached data until TTL expires

**Async Integration:**
- All S3 operations are async (non-blocking)
- Cache operations are synchronous (in-memory, very fast)
- No blocking I/O in request path when cache hits

**Cache Keys:**
- Format: `s3:df:{filename}` for DataFrames
- Format: `api:{endpoint}:{params}` for API responses
- Format: `{type}:{identifier}` for computed visualizations

## Why We Thought It Would Help

### Problems We Were Solving

1. **Repeated S3 Calls**
   - Same data fetched multiple times per request
   - `matches_df.csv` loaded on every `/api/matches` call
   - Event DataFrames fetched repeatedly for same matches

2. **Slow Response Times**
   - S3 latency: 200-500ms per request
   - Network overhead for every data fetch
   - Poor user experience with slow API responses

3. **High AWS Costs**
   - S3 GET requests: $0.0004 per 1,000 requests
   - Data transfer costs
   - Unnecessary API calls for static data

4. **Computed Visualizations**
   - Plotly visualizations take time to generate
   - Same visualizations requested multiple times
   - No need to recompute if data hasn't changed

### Expected Benefits

1. **Performance:** 50-90% reduction in response times for cached data
2. **Cost:** 70-80% reduction in S3 API calls
3. **User Experience:** Faster, more responsive API
4. **Scalability:** Handle more concurrent requests
5. **Reliability:** Reduced dependency on S3 availability

## How It's Actually Helping

### Performance Metrics (Real Test Results)

**Response Time Improvement:**
- **Without Cache:** 457.36ms average
- **With Cache:** 8.38ms average
- **Improvement:** **98.2% faster** ⚡
- **Speedup:** **54.59x faster**

**Throughput:**
- **Without Cache:** 2.19 requests/second
- **With Cache:** 119.36 requests/second
- **Improvement:** **54.5x more requests** handled

**Cache Effectiveness:**
- **Hit Rate:** 80.77% (excellent for production)
- **Time Saved:** 448.99ms per request
- **Total Savings:** 4.49 seconds for 10 requests

### Real-World Impact

**Example: Matches List Endpoint**
```
First Request (Cache MISS):  471.67ms  ← Fetching from S3
Second Request (Cache HIT):    4.70ms   ← Served from cache
Improvement: 100.37x faster!
```

**Cost Savings:**
- **S3 API Calls Reduced:** ~80% (based on hit rate)
- **Data Transfer Reduced:** Significant savings on repeated fetches
- **Compute Time Saved:** Less CPU usage for repeated computations

**User Experience:**
- **Before:** Users wait 400-500ms for responses
- **After:** Users get responses in 4-8ms (cached)
- **Perception:** API feels "instant" vs "slow"

### Production Performance

Based on actual testing:
- ✅ **98%+ improvement** in response times
- ✅ **80%+ cache hit rate** in normal usage
- ✅ **54x throughput increase**
- ✅ **Consistent sub-10ms** response times for cached data
- ✅ **Significant cost reduction** on AWS S3 operations

### Monitoring

Cache statistics are available via:
```bash
GET /api/cache/stats
```

Returns:
```json
{
  "hits": 45,
  "misses": 12,
  "hit_rate": 78.95,
  "size": 23,
  "maxsize": 1000,
  "backend": "memory"
}
```

## Structure

```
cache/
├── __init__.py          # Module exports (cache, async_s3, etc.)
├── config.py            # Cache configuration (TTL, sizes)
├── core.py              # InMemoryCache implementation
├── s3_client.py         # Async S3 client with caching
├── tests/               # Test suite
│   ├── test_cache.py
│   ├── test_async_s3.py
│   ├── test_s3_connection.py
│   └── test_performance.py
├── scripts/             # Utility scripts
│   ├── setup_cache.sh
│   ├── quick_test.sh
│   └── start_and_test.sh
└── docs/                # Documentation
    ├── CACHE_SETUP_GUIDE.md
    ├── CACHE_README.md
    ├── CACHE_TEST_RESULTS.md
    └── QUICK_START.md
```

## Usage

### Basic Import

```python
from cache import cache, async_s3

# Use cache
cache.set("key", value, cache_type="events_df")
cached_value = cache.get("key", cache_type="events_df")

# Use async S3 client
df = await async_s3.get_dataframe("matches_df.csv", cache_type="matches_df")
```

### Cache Types

Different cache types have different TTLs (Time To Live):

- `matches_df`: 15 minutes
- `matches_list`: 15 minutes
- `events_df`: 10 minutes
- `important_moments`: 10 minutes
- `game_phases`: 10 minutes
- `plotly_viz`: 10 minutes
- `passing_network`: 10 minutes
- `possession_scene`: 5 minutes
- `default`: 10 minutes

### Cache Statistics

```python
stats = cache.get_stats()
# Returns: hits, misses, hit_rate, size, maxsize, backend, etc.
```

## Testing

Run tests from the backend directory:

```bash
cd backend
python cache/tests/test_cache.py
python cache/tests/test_async_s3.py
python cache/tests/test_performance.py
```

## Scripts

All scripts are in `cache/scripts/`:

- `setup_cache.sh`: Automated setup and installation
- `quick_test.sh`: Quick cache verification
- `start_and_test.sh`: Start server and run performance tests

## Performance Testing

We've created comprehensive performance tests to measure cache effectiveness:

### Quick Test
```bash
cd backend
source ../venv-backend/bin/activate
python cache/tests/quick_performance_test.py
```

### Full Comparison Test
```bash
python cache/tests/compare_cache_performance.py
```

See `cache/docs/PERFORMANCE_METRICS.md` for detailed results.

## Next Steps: Redis Migration

### Current Status: Proof of Concept

The current in-memory cache implementation was built as a **proof of concept** to validate the caching strategy and measure performance improvements. The results have been excellent (98%+ improvement), demonstrating that caching is a critical optimization for this API.

### Why Migrate to Redis?

While the in-memory cache works perfectly for single-instance deployments, **Redis is the next step** for production scalability:

1. **Multi-Instance Support**
   - Load-balanced deployments need shared cache
   - In-memory cache is per-process (not shared)
   - Redis provides centralized cache for all instances

2. **Persistence**
   - In-memory cache is lost on server restart
   - Redis can persist cache to disk
   - Faster recovery after deployments

3. **Scalability**
   - Redis can handle much larger cache sizes
   - Better memory management
   - Supports distributed caching

4. **Advanced Features**
   - Pub/sub for cache invalidation
   - Atomic operations
   - Better monitoring and metrics
   - Cluster support for high availability

### Migration Plan

The architecture was **designed from the start** to make Redis migration seamless:

**Step 1: Create Redis Cache Implementation**
```python
# cache/redis_cache.py
class RedisCache:
    def __init__(self):
        self.redis_client = redis.Redis(...)
    
    def get(self, key: str, cache_type: str = "default"):
        # Same interface as InMemoryCache
        ...
    
    def set(self, key: str, value: Any, cache_type: str = "default"):
        # Same interface as InMemoryCache
        ...
```

**Step 2: Update Module Exports**
```python
# cache/__init__.py
from .redis_cache import cache, RedisCache  # Instead of InMemoryCache
```

**Step 3: No Changes Needed in `app.py`**
- Same `cache.get()` and `cache.set()` calls
- Same cache types and TTLs
- Zero code changes in application logic

### Redis Configuration

**Recommended Setup:**
- **Deployment:** Managed Redis (AWS ElastiCache, Redis Cloud, etc.)
- **Memory:** Start with 1-2GB, scale as needed
- **Persistence:** RDB snapshots + AOF for durability
- **High Availability:** Redis Sentinel or Cluster mode

**TTL Strategy:**
- Keep same TTL values from `config.py`
- Redis supports per-key TTL (better than TTLCache's global TTL)
- Can implement more granular expiration policies

### Expected Benefits of Redis

1. **Shared Cache:** All API instances share the same cache
2. **Better Hit Rates:** Cache survives restarts and deployments
3. **Monitoring:** Better observability with Redis metrics
4. **Scalability:** Handle larger datasets and more concurrent users
5. **Reliability:** High availability with Redis Sentinel/Cluster

### Migration Checklist

- [ ] Set up Redis instance (managed or self-hosted)
- [ ] Install `redis-py` and `hiredis` packages
- [ ] Create `RedisCache` class with same interface
- [ ] Update `cache/__init__.py` to use Redis
- [ ] Test with same performance test suite
- [ ] Deploy and monitor cache hit rates
- [ ] Remove in-memory cache code (optional)

### Current Status

✅ **In-memory cache is working excellently** for single-instance deployments with 98%+ performance improvement. This validates the caching strategy and provides a clear path forward for Redis migration when scaling to multiple instances.

