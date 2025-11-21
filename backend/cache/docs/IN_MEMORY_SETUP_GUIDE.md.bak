# 🚀 Caching System Setup Guide

Complete step-by-step guide to set up the in-memory caching system for the Soccer Analytics API.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Create Virtual Environment](#step-1-create-virtual-environment)
3. [Step 2: Install Dependencies](#step-2-install-dependencies)
4. [Step 3: Verify Installation](#step-3-verify-installation)
5. [Step 4: Configure Environment Variables](#step-4-configure-environment-variables)
6. [Step 5: Test the Cache System](#step-5-test-the-cache-system)
7. [Step 6: Start the Server](#step-6-start-the-server)
8. [Troubleshooting](#troubleshooting)
9. [Upgrading to Redis (Optional)](#upgrading-to-redis-optional)

---

## Prerequisites

- Python 3.9+ installed
- pip (Python package manager)
- Access to the project directory
- AWS credentials (if using S3)

---

## Step 1: Create Virtual Environment

### Option A: Using venv (Recommended)

```bash
# Navigate to project root
cd /path/to/Columbia-MSDS-F25-Soccer

# Create virtual environment
python3 -m venv venv-backend

# Activate virtual environment
# On macOS/Linux:
source venv-backend/bin/activate

# On Windows:
# venv-backend\Scripts\activate
```

### Option B: Using conda

```bash
conda create -n soccer-backend python=3.10
conda activate soccer-backend
```

**✅ Verification:** You should see `(venv-backend)` or `(soccer-backend)` in your terminal prompt.

---

## Step 2: Install Dependencies

```bash
# Make sure you're in the backend directory
cd backend

# Upgrade pip first
pip install --upgrade pip

# Install all dependencies
pip install -r requirements.txt
```

**Expected output:**
```
Successfully installed fastapi uvicorn pandas plotly numpy ...
Successfully installed cachetools-5.3.2
Successfully installed aioboto3-12.3.0
Successfully installed python-dotenv
```

**Key packages for caching:**
- `cachetools==5.3.2` - In-memory caching with TTL
- `aioboto3==12.3.0` - Async S3 operations
- `python-dotenv` - Environment variable management

---

## Step 3: Verify Installation

```bash
# Test that all packages are installed
python -c "import fastapi, cachetools, aioboto3, dotenv; print('✅ All packages installed!')"
```

**Expected output:**
```
✅ All packages installed!
```

If you see an error, re-run `pip install -r requirements.txt`.

---

## Step 4: Configure Environment Variables

### Create `.env` file

```bash
# In the backend directory
cd backend

# Create .env file (if it doesn't exist)
touch .env
```

### Add AWS credentials to `.env`

```bash
# Edit .env file with your AWS credentials
nano .env
# or
vim .env
# or use any text editor
```

**Required variables:**

```env
# AWS Configuration
AWS_REGION=us-east-2
S3_BUCKET_NAME=capstone-soccer-data
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# Optional: S3 timeout (default: 30 seconds)
S3_TIMEOUT_SECONDS=30
```

**⚠️ Security Note:**
- Never commit `.env` file to git
- Add `.env` to `.gitignore`
- Use environment variables in production

---

## Step 5: Test the Cache System

### Test 1: Basic Cache Functionality

```bash
# Activate virtual environment (if not already active)
source ../venv-backend/bin/activate

# Run cache test
cd backend
python test_cache.py
```

**Expected output:**
```
============================================================
CACHE SYSTEM TEST SUITE
============================================================

✅ Cache set/get works correctly
✅ Cache metrics tracking works correctly
✅ Cache TTL configuration is correct
...
✅ ALL TESTS PASSED!
```

### Test 2: S3 Connection

```bash
# Test S3 connection
python test_s3_connection.py
```

**Expected output:**
```
✅ Bucket exists and is accessible
✅ Found X objects
✅ matches_df.csv exists
```

### Test 3: Async S3 with Caching

```bash
# Test async S3 client
python test_async_s3.py
```

---

## Step 6: Start the Server

### Start Backend Server

```bash
# Make sure virtual environment is activated
source ../venv-backend/bin/activate

# Navigate to backend directory
cd backend

# Start the server
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

**Expected output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
🔥 Starting cache warmup...
✅ Cache warmed: matches_df.csv
✅ Cache warmup complete
```

### Verify Server is Running

**In a new terminal:**

```bash
# Test cache stats endpoint
curl http://localhost:8000/api/cache/stats

# Test matches endpoint
curl http://localhost:8000/api/matches
```

**Expected responses:**
- Cache stats: JSON with hit/miss counts
- Matches: Array of match files

---

## 🧪 Testing Cache Performance

### Quick Performance Test

```bash
# Run the performance test script
cd backend
./quick_test.sh
```

**Or manually:**

```bash
# First request (cache miss - slower)
time curl http://localhost:8000/api/matches

# Second request (cache hit - faster!)
time curl http://localhost:8000/api/matches

# Check cache stats
curl http://localhost:8000/api/cache/stats | python3 -m json.tool
```

**Expected results:**
- First request: 2-5 seconds
- Second request: <0.5 seconds
- Improvement: 50-90% faster

---

## 📊 Cache Configuration

### Default TTL Settings

The cache uses different TTL (Time To Live) values for different data types:

```python
CACHE_TTL = {
    "matches_df": 900,        # 15 minutes
    "matches_list": 900,      # 15 minutes
    "events_df": 600,         # 10 minutes
    "important_moments": 600, # 10 minutes
    "game_phases": 600,       # 10 minutes
    "plotly_viz": 600,        # 10 minutes
    "passing_network": 600,   # 10 minutes
    "possession_scene": 300,  # 5 minutes
    "default": 600,           # 10 minutes
}
```

### Adjusting Cache Settings

Edit `backend/cache.py`:

```python
# Change max cache size (default: 1000 items)
cache = InMemoryCache(maxsize=2000)  # Increase to 2000 items

# Change default TTL
CACHE_TTL["default"] = 1200  # 20 minutes instead of 10
```

---

## 🔍 Monitoring Cache Performance

### Check Cache Statistics

```bash
# Via API endpoint
curl http://localhost:8000/api/cache/stats | python3 -m json.tool
```

**Response example:**
```json
{
    "backend": "memory",
    "hits": 45,
    "misses": 12,
    "total": 57,
    "hit_rate": 78.95,
    "size": 23,
    "maxsize": 1000,
    "ttl_default": 600
}
```

### Understanding Metrics

- **hits**: Number of successful cache retrievals
- **misses**: Number of cache misses (data fetched from source)
- **hit_rate**: Percentage of requests served from cache
- **size**: Current number of items in cache
- **maxsize**: Maximum cache capacity

**Good performance indicators:**
- Hit rate > 70% after warmup period
- Size < maxsize (cache not full)
- Hits >> misses (cache is effective)

---

## 🐛 Troubleshooting

### Issue: "ModuleNotFoundError: No module named 'cachetools'"

**Solution:**
```bash
# Make sure virtual environment is activated
source venv-backend/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

### Issue: "Unable to locate credentials" (S3 errors)

**Solution:**
1. Check `.env` file exists in `backend/` directory
2. Verify AWS credentials are correct
3. Ensure `.env` file is being loaded (check app.py has `load_dotenv()`)

```bash
# Test credentials manually
python test_s3_connection.py
```

### Issue: "Cache not working" (no performance improvement)

**Solution:**
1. Check cache stats: `curl http://localhost:8000/api/cache/stats`
2. Verify cache is being used (hits > 0)
3. Check server logs for "Cache HIT" / "Cache MISS" messages
4. Ensure you're testing the same endpoint twice

### Issue: Server won't start

**Solution:**
```bash
# Check for syntax errors
python -m py_compile app.py cache.py s3_async.py

# Check if port is already in use
lsof -i :8000

# Try different port
uvicorn app:app --reload --port 8001
```

### Issue: Import errors ("No module named 'backend'")

**Solution:**
- Make sure you're running from the `backend/` directory
- Or use relative imports (already fixed in code)

---

## 🔄 Upgrading to Redis (Optional)

When you're ready to scale beyond in-memory caching:

### Step 1: Install Redis

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

**Or use Redis Cloud:**
- Sign up at https://redis.com/try-free/
- Get connection URL

### Step 2: Install Python Redis Client

```bash
pip install redis==5.0.1
```

### Step 3: Update `cache.py`

Replace the `InMemoryCache` class with a Redis-backed implementation:

```python
import redis

class RedisCache:
    def __init__(self):
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        self.client = redis.from_url(redis_url, decode_responses=False)
        self.metrics = CacheMetrics()
    
    def get(self, key: str, cache_type: str = "default") -> Optional[Any]:
        try:
            value = self.client.get(key)
            if value:
                self.metrics.record_hit()
                return pickle.loads(value)
            else:
                self.metrics.record_miss()
                return None
        except Exception as e:
            logger.error(f"Redis get error: {e}")
            return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None, cache_type: str = "default"):
        try:
            if ttl is None:
                ttl = CACHE_TTL.get(cache_type, CACHE_TTL["default"])
            self.client.setex(key, ttl, pickle.dumps(value))
        except Exception as e:
            logger.error(f"Redis set error: {e}")

# Use Redis if available, fallback to memory
try:
    cache = RedisCache()
except:
    cache = InMemoryCache()
```

### Step 4: Set Redis URL

```bash
# Add to .env file
REDIS_URL=redis://localhost:6379
# or for Redis Cloud:
REDIS_URL=redis://default:password@redis-12345.c1.us-east-1-1.ec2.cloud.redislabs.com:12345
```

---

## 📝 Quick Reference

### Essential Commands

```bash
# Activate virtual environment
source venv-backend/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start server
uvicorn app:app --reload

# Test cache
python test_cache.py

# Check cache stats
curl http://localhost:8000/api/cache/stats
```

### File Structure

```
backend/
├── app.py              # Main FastAPI application
├── cache.py            # Cache implementation
├── s3_async.py         # Async S3 client with caching
├── requirements.txt    # Python dependencies
├── .env                # Environment variables (not in git)
├── test_cache.py       # Cache unit tests
├── test_s3_connection.py  # S3 connection test
└── test_async_s3.py    # Async S3 test
```

### Key Endpoints

- `GET /api/cache/stats` - Cache statistics
- `GET /api/matches` - List matches (cached)
- `GET /api/match/{filename}/viz` - Shot map (cached)
- `GET /api/match/{filename}/important_moments` - Moments (cached)
- `GET /api/match/{filename}/game_phases` - Phases (cached)

---

## ✅ Verification Checklist

Before considering setup complete, verify:

- [ ] Virtual environment created and activated
- [ ] All dependencies installed (`pip list` shows cachetools, aioboto3)
- [ ] `.env` file created with AWS credentials
- [ ] Cache tests pass (`python test_cache.py`)
- [ ] S3 connection works (`python test_s3_connection.py`)
- [ ] Server starts without errors
- [ ] Cache stats endpoint returns data
- [ ] Second API request is faster than first (cache working)

---

## 🎯 Next Steps

1. **Monitor Performance**: Check cache hit rates regularly
2. **Adjust TTL**: Fine-tune cache expiration times based on usage
3. **Scale Up**: Consider Redis when deploying to production
4. **Add More Endpoints**: Apply caching to other slow endpoints

---

## 📚 Additional Resources

- **Cachetools Documentation**: https://cachetools.readthedocs.io/
- **aioboto3 Documentation**: https://aioboto3.readthedocs.io/
- **FastAPI Documentation**: https://fastapi.tiangolo.com/
- **Python-dotenv**: https://pypi.org/project/python-dotenv/

---

## 💡 Tips

1. **Cache Warming**: The app automatically warms cache on startup
2. **TTL Tuning**: Adjust TTL based on how often data changes
3. **Monitoring**: Check `/api/cache/stats` regularly to track performance
4. **Error Handling**: Cache failures gracefully fall back to direct S3 access

---

## 🆘 Getting Help

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review server logs for error messages
3. Test individual components (cache, S3, app) separately
4. Verify environment variables are set correctly

---

**Last Updated:** November 2025  
**Version:** 1.0  
**Status:** ✅ Production Ready

