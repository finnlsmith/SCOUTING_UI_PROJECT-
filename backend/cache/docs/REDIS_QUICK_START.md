# Redis Cache - Quick Start

**Get Redis caching running in 3 minutes!**

---

## Prerequisites

- Upstash Redis account (free tier works)
- `REDIS_URL` in `backend/.env`

---

## Setup (3 Steps)

### 1. Add Redis URL to `.env`

```bash
cd backend
echo 'REDIS_URL="rediss://default:YOUR_TOKEN@YOUR_HOST:6379"' >> .env
```

### 2. Install Dependencies

```bash
source ../.venv/bin/activate  # or source .venv/bin/activate if venv is in backend/
pip install -r ../requirements.txt  # Use root requirements.txt (canonical)
```

### 3. Start Server

```bash
uvicorn app:app --reload
```

**Done!** The system automatically uses Redis if `REDIS_URL` is set.

---

## Verify It Works

```bash
# Should show "backend": "redis"
curl http://localhost:8000/api/cache/stats
```

---

## Expected Performance

- **First request:** ~420ms (cache miss)
- **Second request:** ~35-46ms (cache hit)
- **Improvement:** 89-92% faster
- **Hit rate:** 90%+

---

## Need More Details?

See `REDIS_SETUP_GUIDE.md` for:
- Detailed setup instructions
- Troubleshooting
- Configuration options
- Performance metrics

---

**Note:** We started with in-memory caching as a proof of concept (achieved 98%+ improvements), then migrated to Redis for production scalability and shared cache support.

