# ⚡ Quick Start - Cache System

**Fastest way to get the caching system up and running!**

---

## 🚀 Automated Setup (Recommended)

```bash
cd backend
./setup_cache.sh
```

This script will:
- ✅ Create virtual environment
- ✅ Install all dependencies
- ✅ Verify installation
- ✅ Check configuration
- ✅ Run tests

---

## 📝 Manual Setup (5 minutes)

### 1. Create Virtual Environment

```bash
cd /path/to/Columbia-MSDS-F25-Soccer
python3 -m venv venv-backend
source venv-backend/bin/activate  # On Windows: venv-backend\Scripts\activate
```

### 2. Install Dependencies

```bash
cd backend
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
# Create .env file
cat > .env << EOF
AWS_REGION=us-east-2
S3_BUCKET_NAME=capstone-soccer-data
AWS_ACCESS_KEY_ID=your_key_here
AWS_SECRET_ACCESS_KEY=your_secret_here
EOF
```

### 4. Test

```bash
python test_cache.py
```

### 5. Start Server

```bash
uvicorn app:app --reload
```

---

## ✅ Verify It's Working

```bash
# Test cache stats
curl http://localhost:8000/api/cache/stats

# Test matches endpoint (first call - slow)
time curl http://localhost:8000/api/matches

# Test again (second call - fast!)
time curl http://localhost:8000/api/matches
```

**Expected:** Second call should be 50-90% faster!

---

## 📚 Full Documentation

See `CACHE_SETUP_GUIDE.md` for:
- Detailed troubleshooting
- Configuration options
- Redis upgrade guide
- Performance tuning

---

## 🆘 Need Help?

1. Check `CACHE_SETUP_GUIDE.md` troubleshooting section
2. Run `python test_cache.py` to verify cache works
3. Check server logs for error messages

---

**That's it! You're ready to go! 🎉**

