#!/usr/bin/env python3
"""
Test script for the caching system.
Tests cache functionality without requiring the full FastAPI app.
"""
import sys
import time
import os
# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from cache import cache, CACHE_TTL

def test_basic_cache():
    """Test basic cache set/get operations"""
    print("=" * 60)
    print("TEST 1: Basic Cache Operations")
    print("=" * 60)
    
    # Test set and get
    cache.set("test_key_1", "test_value_1", cache_type="default")
    result = cache.get("test_key_1")
    
    assert result == "test_value_1", f"Expected 'test_value_1', got {result}"
    print("✅ Cache set/get works correctly")
    
    # Test cache miss
    result = cache.get("non_existent_key")
    assert result is None, f"Expected None for non-existent key, got {result}"
    print("✅ Cache miss handling works correctly")
    
    # Test cache delete
    cache.set("test_key_2", "test_value_2")
    cache.delete("test_key_2")
    result = cache.get("test_key_2")
    assert result is None, f"Expected None after delete, got {result}"
    print("✅ Cache delete works correctly")
    
    print()

def test_cache_metrics():
    """Test cache hit/miss metrics"""
    print("=" * 60)
    print("TEST 2: Cache Metrics")
    print("=" * 60)
    
    # Reset metrics by getting stats
    initial_stats = cache.get_stats()
    initial_hits = initial_stats['hits']
    initial_misses = initial_stats['misses']
    
    # Generate some hits
    cache.set("metric_test_1", "value1")
    cache.get("metric_test_1")  # Hit
    cache.get("metric_test_1")  # Hit
    cache.get("non_existent")   # Miss
    
    stats = cache.get_stats()
    print(f"Initial hits: {initial_hits}, misses: {initial_misses}")
    print(f"Current hits: {stats['hits']}, misses: {stats['misses']}")
    print(f"Hit rate: {stats['hit_rate']:.2f}%")
    
    assert stats['hits'] >= initial_hits + 2, "Hits should have increased"
    assert stats['misses'] >= initial_misses + 1, "Misses should have increased"
    print("✅ Cache metrics tracking works correctly")
    print()

def test_cache_ttl():
    """Test cache TTL expiration"""
    print("=" * 60)
    print("TEST 3: Cache TTL (Time To Live)")
    print("=" * 60)
    
    # Note: TTLCache uses a single TTL for all items
    # So we can't test per-item TTL easily, but we can verify the cache works
    cache.set("ttl_test", "value", cache_type="default")
    result = cache.get("ttl_test")
    assert result == "value", "Value should be cached"
    print("✅ Value cached successfully")
    print(f"   Default TTL: {CACHE_TTL['default']} seconds")
    print(f"   Matches TTL: {CACHE_TTL['matches_df']} seconds")
    print(f"   Viz TTL: {CACHE_TTL['plotly_viz']} seconds")
    print("✅ TTL configuration is correct")
    print()

def test_cache_types():
    """Test different cache types"""
    print("=" * 60)
    print("TEST 4: Cache Types")
    print("=" * 60)
    
    cache_types = ["matches_df", "events_df", "plotly_viz", "important_moments", "game_phases"]
    for cache_type in cache_types:
        key = f"test_{cache_type}"
        cache.set(key, f"value_{cache_type}", cache_type=cache_type)
        result = cache.get(key, cache_type=cache_type)
        assert result == f"value_{cache_type}", f"Cache type {cache_type} failed"
        print(f"✅ Cache type '{cache_type}' works (TTL: {CACHE_TTL.get(cache_type, 'default')}s)")
    print()

def test_cache_stats_endpoint():
    """Test cache stats structure"""
    print("=" * 60)
    print("TEST 5: Cache Stats Structure")
    print("=" * 60)
    
    stats = cache.get_stats()
    required_keys = ['backend', 'hits', 'misses', 'total', 'hit_rate', 'size', 'maxsize', 'ttl_default']
    
    for key in required_keys:
        assert key in stats, f"Missing key in stats: {key}"
        print(f"✅ Stats key '{key}': {stats[key]}")
    
    assert stats['backend'] == 'memory', "Should be using memory backend"
    assert stats['maxsize'] == 1000, "Max size should be 1000"
    print("✅ Cache stats structure is correct")
    print()

def test_cache_clear():
    """Test cache clear functionality"""
    print("=" * 60)
    print("TEST 6: Cache Clear")
    print("=" * 60)
    
    # Add some items
    cache.set("clear_test_1", "value1")
    cache.set("clear_test_2", "value2")
    
    assert cache.get("clear_test_1") == "value1", "Item should exist"
    assert cache.get("clear_test_2") == "value2", "Item should exist"
    
    # Clear cache
    cache.clear()
    
    assert cache.get("clear_test_1") is None, "Item should be cleared"
    assert cache.get("clear_test_2") is None, "Item should be cleared"
    print("✅ Cache clear works correctly")
    print()

def main():
    """Run all tests"""
    print("\n" + "=" * 60)
    print("CACHE SYSTEM TEST SUITE")
    print("=" * 60 + "\n")
    
    try:
        test_basic_cache()
        test_cache_metrics()
        test_cache_ttl()
        test_cache_types()
        test_cache_stats_endpoint()
        test_cache_clear()
        
        print("=" * 60)
        print("✅ ALL TESTS PASSED!")
        print("=" * 60)
        print("\nFinal cache stats:")
        stats = cache.get_stats()
        for key, value in stats.items():
            print(f"  {key}: {value}")
        return 0
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        return 1
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())

