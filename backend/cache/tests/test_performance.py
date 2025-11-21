#!/usr/bin/env python3
"""
Performance testing script for the caching system.
Tests actual endpoint response times with and without cache.
"""
import requests
import time
import json
import sys
import os
# Add parent directory to path for imports (if needed)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

BASE_URL = "http://localhost:8000/api"

def format_time(seconds):
    """Format time in a readable way"""
    if seconds < 1:
        return f"{seconds*1000:.2f}ms"
    return f"{seconds:.2f}s"

def test_endpoint(endpoint, description, params=None):
    """Test an endpoint and measure response time"""
    print(f"\n{'='*70}")
    print(f"Testing: {description}")
    print(f"Endpoint: {endpoint}")
    print(f"{'='*70}")
    
    url = f"{BASE_URL}{endpoint}"
    if params:
        url += "?" + "&".join([f"{k}={v}" for k, v in params.items()])
    
    # First request (cache miss)
    print("\n📥 First Request (Cache MISS - should be slower):")
    start = time.time()
    try:
        response1 = requests.get(url, timeout=60)
        time1 = time.time() - start
        print(f"   Status: {response1.status_code}")
        print(f"   Time: {format_time(time1)}")
        if response1.status_code != 200:
            print(f"   Error: {response1.text[:200]}")
            return None, None
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return None, None
    
    # Small delay to ensure cache is set
    time.sleep(0.5)
    
    # Second request (cache hit)
    print("\n📥 Second Request (Cache HIT - should be faster):")
    start = time.time()
    try:
        response2 = requests.get(url, timeout=60)
        time2 = time.time() - start
        print(f"   Status: {response2.status_code}")
        print(f"   Time: {format_time(time2)}")
        if response2.status_code != 200:
            print(f"   Error: {response2.text[:200]}")
            return time1, None
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return time1, None
    
    # Calculate improvement
    if time1 and time2:
        improvement = ((time1 - time2) / time1) * 100
        speedup = time1 / time2 if time2 > 0 else 0
        print(f"\n📊 Performance Improvement:")
        print(f"   Speedup: {speedup:.2f}x faster")
        print(f"   Improvement: {improvement:.1f}%")
        
        if improvement > 50:
            print(f"   ✅ EXCELLENT! (>50% improvement)")
        elif improvement > 30:
            print(f"   ✅ GOOD! (>30% improvement)")
        elif improvement > 0:
            print(f"   ⚠️  MODERATE ({improvement:.1f}% improvement)")
        else:
            print(f"   ❌ No improvement (cache may not be working)")
    
    return time1, time2

def test_cache_stats():
    """Test the cache stats endpoint"""
    print(f"\n{'='*70}")
    print("Cache Statistics")
    print(f"{'='*70}")
    
    try:
        response = requests.get(f"{BASE_URL}/cache/stats", timeout=10)
        if response.status_code == 200:
            stats = response.json()
            print("\n📊 Cache Stats:")
            for key, value in stats.items():
                if key == 'hit_rate':
                    print(f"   {key}: {value:.2f}%")
                else:
                    print(f"   {key}: {value}")
            return stats
        else:
            print(f"   ❌ Error: {response.status_code}")
            return None
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return None

def main():
    """Run performance tests"""
    print("\n" + "="*70)
    print("CACHE PERFORMANCE TEST SUITE")
    print("="*70)
    print("\n⚠️  Make sure the server is running on http://localhost:8000")
    print("   Start it with: uvicorn app:app --reload")
    print("\nPress Enter to continue or Ctrl+C to cancel...")
    
    try:
        input()
    except KeyboardInterrupt:
        print("\nCancelled.")
        return 1
    
    # Test if server is running
    try:
        response = requests.get(f"{BASE_URL}/cache/stats", timeout=5)
        print("✅ Server is running!")
    except Exception as e:
        print(f"\n❌ Cannot connect to server: {e}")
        print("   Please start the server first:")
        print("   cd backend && uvicorn app:app --reload")
        return 1
    
    results = []
    
    # Test 1: Matches endpoint
    time1, time2 = test_endpoint("/matches", "List Matches")
    if time1 and time2:
        results.append(("Matches List", time1, time2))
    
    # Test cache stats after first endpoint
    stats = test_cache_stats()
    
    # Note: Other endpoints require actual match files in S3
    # So we'll just test what we can
    
    print(f"\n{'='*70}")
    print("TEST SUMMARY")
    print(f"{'='*70}")
    
    if results:
        print("\n📊 Results:")
        for name, t1, t2 in results:
            improvement = ((t1 - t2) / t1) * 100
            print(f"   {name}:")
            print(f"      First:  {format_time(t1)}")
            print(f"      Second: {format_time(t2)}")
            print(f"      Improvement: {improvement:.1f}%")
    
    if stats:
        print(f"\n📈 Final Cache Stats:")
        print(f"   Hits: {stats.get('hits', 0)}")
        print(f"   Misses: {stats.get('misses', 0)}")
        print(f"   Hit Rate: {stats.get('hit_rate', 0):.2f}%")
    
    print(f"\n{'='*70}")
    print("✅ Testing complete!")
    print(f"{'='*70}\n")
    
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\nCancelled by user.")
        sys.exit(1)

