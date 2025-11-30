#!/usr/bin/env python3
"""Test Redis connection to Upstash"""
import os
import sys
from dotenv import load_dotenv
import redis

# Load .env
load_dotenv()

print("=" * 70)
print("Testing Redis Connection to Upstash")
print("=" * 70)

redis_url = os.getenv("REDIS_URL")
if not redis_url:
    print("❌ REDIS_URL not found in .env file")
    sys.exit(1)

# Remove quotes if present
redis_url = redis_url.strip('"').strip("'")

print(f"\n✅ Found REDIS_URL in .env")
print(f"   URL: {redis_url[:50]}...")

try:
    # Parse URL and create Redis client
    # Upstash URLs use rediss:// (with SSL) or redis://
    # from_url automatically handles SSL based on the protocol
    r = redis.from_url(redis_url, decode_responses=False)
    
    # Test connection
    print("\n📡 Testing connection...")
    r.ping()
    print("✅ Connection successful!")
    
    # Test basic operations
    print("\n🧪 Testing basic operations...")
    
    # Set a test key
    r.set("test_key", "test_value", ex=60)
    print("   ✅ SET operation works")
    
    # Get the test key
    value = r.get("test_key")
    if value == b"test_value":
        print("   ✅ GET operation works")
    else:
        print(f"   ❌ GET returned: {value}")
    
    # Test TTL
    ttl = r.ttl("test_key")
    print(f"   ✅ TTL operation works (TTL: {ttl}s)")
    
    # Delete test key
    r.delete("test_key")
    print("   ✅ DELETE operation works")
    
    # Get Redis info
    info = r.info("memory")
    print(f"\n📊 Redis Memory Info:")
    print(f"   Used Memory: {info.get('used_memory_human', 'N/A')}")
    print(f"   Max Memory: {info.get('maxmemory_human', 'N/A')}")
    
    # Check if maxmemory is set (Upstash free tier: 256 MB)
    maxmemory = info.get('maxmemory', 0)
    if maxmemory > 0:
        maxmemory_mb = maxmemory / (1024 * 1024)
        print(f"   Max Memory Limit: {maxmemory_mb:.1f} MB")
    else:
        print(f"   ⚠️  No maxmemory limit set (should be ~256 MB for Upstash free tier)")
    
    print("\n" + "=" * 70)
    print("✅ All Redis connection tests passed!")
    print("=" * 70)
    
except redis.ConnectionError as e:
    print(f"\n❌ Connection Error: {e}")
    print("\nTroubleshooting:")
    print("  1. Check REDIS_URL in .env file")
    print("  2. Verify Upstash database is running")
    print("  3. Check if SSL is required (Upstash requires SSL)")
    sys.exit(1)
except Exception as e:
    print(f"\n❌ Error: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

