#!/usr/bin/env python3
"""Test RedisCache implementation"""
import sys
import os
import pandas as pd
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from dotenv import load_dotenv
load_dotenv()

from cache.redis_cache import RedisCache

print("=" * 70)
print("Testing RedisCache Implementation")
print("=" * 70)

try:
    cache = RedisCache()
    print("✅ RedisCache initialized\n")
    
    # Test 1: Simple value (JSON)
    print("Test 1: Simple value (JSON)")
    cache.set("test_str", "hello world", cache_type="default")
    value = cache.get("test_str")
    assert value == "hello world", f"Expected 'hello world', got {value}"
    print("   ✅ String caching works")
    
    # Test 2: Dictionary (JSON)
    print("\nTest 2: Dictionary (JSON)")
    test_dict = {"key1": "value1", "key2": 42, "key3": [1, 2, 3]}
    cache.set("test_dict", test_dict, cache_type="default")
    value = cache.get("test_dict")
    assert value == test_dict, f"Dict mismatch"
    print("   ✅ Dictionary caching works")
    
    # Test 3: DataFrame (Pickle)
    print("\nTest 3: DataFrame (Pickle)")
    test_df = pd.DataFrame({"col1": [1, 2, 3], "col2": [4, 5, 6]})
    cache.set("test_df", test_df, cache_type="events_df")
    value = cache.get("test_df")
    assert isinstance(value, pd.DataFrame), "Should return DataFrame"
    assert value.equals(test_df), "DataFrame mismatch"
    print("   ✅ DataFrame caching works")
    
    # Test 4: TTL
    print("\nTest 4: TTL")
    cache.set("test_ttl", "expires_soon", cache_type="possession_scene")  # 5 min TTL
    ttl = cache.client.ttl("test_ttl")
    assert 290 <= ttl <= 300, f"TTL should be ~300s, got {ttl}"
    print(f"   ✅ TTL works (TTL: {ttl}s)")
    
    # Test 5: Stats
    print("\nTest 5: Statistics")
    stats = cache.get_stats()
    assert stats["backend"] == "redis"
    assert stats["hits"] >= 3  # At least 3 hits from above tests
    print(f"   ✅ Stats: {stats['hits']} hits, {stats['misses']} misses")
    print(f"   ✅ Memory: {stats.get('memory_used_mb', 'N/A')} MB")
    
    # Test 6: Delete
    print("\nTest 6: Delete")
    cache.delete("test_str")
    value = cache.get("test_str")
    assert value is None, "Key should be deleted"
    print("   ✅ Delete works")
    
    # Cleanup
    cache.delete("test_dict")
    cache.delete("test_df")
    cache.delete("test_ttl")
    
    print("\n" + "=" * 70)
    print("✅ All RedisCache tests passed!")
    print("=" * 70)
    
except Exception as e:
    print(f"\n❌ Test failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

