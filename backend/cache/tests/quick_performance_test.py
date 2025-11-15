#!/usr/bin/env python3
"""
Quick performance test showing cache benefits.
Tests the same endpoint multiple times to show cache hit improvements.
"""
import requests
import time
import statistics
import sys

BASE_URL = "http://localhost:8000/api"

def format_time(seconds):
    """Format time in readable format"""
    if seconds < 1:
        return f"{seconds*1000:.2f}ms"
    return f"{seconds:.2f}s"

def main():
    print("\n" + "="*70)
    print("QUICK CACHE PERFORMANCE TEST")
    print("="*70)
    print("\nThis test shows how cache improves response times on repeated requests.")
    print("="*70)
    
    # Check server
    try:
        requests.get(f"{BASE_URL}/cache/stats", timeout=5)
        print("✅ Server is running!\n")
    except:
        print("❌ Server not running. Please start it first.")
        return 1
    
    # Clear cache to start fresh
    print("📥 Clearing cache...")
    try:
        response = requests.post(f"{BASE_URL}/cache/clear", timeout=5)
        if response.status_code == 200:
            print("   ✅ Cache cleared\n")
        else:
            print(f"   ⚠️  Could not clear cache (status: {response.status_code})\n")
    except Exception as e:
        print(f"   ⚠️  Could not clear cache: {e}\n")
    
    # Test 1: First request (cache miss - slow)
    print("="*70)
    print("TEST 1: First Request (Cache MISS - fetching from S3)")
    print("="*70)
    start = time.time()
    response1 = requests.get(f"{BASE_URL}/matches", timeout=30)
    time1 = time.time() - start
    
    if response1.status_code == 200:
        print(f"✅ Status: {response1.status_code}")
        print(f"⏱️  Response Time: {format_time(time1)}")
        print(f"📦 Data Size: {len(response1.content) / 1024:.2f} KB")
    else:
        print(f"❌ Error: {response1.status_code}")
        return 1
    
    # Get cache stats after first request
    stats1 = requests.get(f"{BASE_URL}/cache/stats", timeout=5).json()
    print(f"\n📊 Cache Stats After First Request:")
    print(f"   Hits: {stats1['hits']}, Misses: {stats1['misses']}, Hit Rate: {stats1['hit_rate']:.1f}%")
    
    time.sleep(0.5)
    
    # Test 2: Second request (cache hit - fast)
    print("\n" + "="*70)
    print("TEST 2: Second Request (Cache HIT - served from cache)")
    print("="*70)
    start = time.time()
    response2 = requests.get(f"{BASE_URL}/matches", timeout=30)
    time2 = time.time() - start
    
    if response2.status_code == 200:
        print(f"✅ Status: {response2.status_code}")
        print(f"⏱️  Response Time: {format_time(time2)}")
        print(f"📦 Data Size: {len(response2.content) / 1024:.2f} KB")
    else:
        print(f"❌ Error: {response2.status_code}")
        return 1
    
    # Get cache stats after second request
    stats2 = requests.get(f"{BASE_URL}/cache/stats", timeout=5).json()
    print(f"\n📊 Cache Stats After Second Request:")
    print(f"   Hits: {stats2['hits']}, Misses: {stats2['misses']}, Hit Rate: {stats2['hit_rate']:.1f}%")
    
    # Test 3: Multiple requests to show consistency
    print("\n" + "="*70)
    print("TEST 3: Multiple Requests (All Cache HITS)")
    print("="*70)
    times = []
    for i in range(10):
        start = time.time()
        response = requests.get(f"{BASE_URL}/matches", timeout=30)
        elapsed = time.time() - start
        if response.status_code == 200:
            times.append(elapsed)
        time.sleep(0.1)
    
    if times:
        avg_time = statistics.mean(times)
        min_time = min(times)
        max_time = max(times)
        print(f"✅ Made {len(times)} successful requests")
        print(f"⏱️  Average Time: {format_time(avg_time)}")
        print(f"⏱️  Min Time: {format_time(min_time)}")
        print(f"⏱️  Max Time: {format_time(max_time)}")
    
    # Final stats
    stats3 = requests.get(f"{BASE_URL}/cache/stats", timeout=5).json()
    
    # Results Summary
    print("\n" + "="*70)
    print("PERFORMANCE COMPARISON")
    print("="*70)
    
    improvement = ((time1 - time2) / time1) * 100
    speedup = time1 / time2 if time2 > 0 else 0
    
    print(f"\n📊 Results:")
    print(f"   First Request (Cache MISS):  {format_time(time1)}")
    print(f"   Second Request (Cache HIT):  {format_time(time2)}")
    if times:
        print(f"   Average (10 Cache HITs):     {format_time(avg_time)}")
    
    print(f"\n🚀 Improvement:")
    print(f"   Speedup: {speedup:.2f}x faster")
    print(f"   Improvement: {improvement:.1f}%")
    print(f"   Time Saved: {format_time(time1 - time2)} per request")
    
    if improvement > 50:
        print(f"\n   ✅ EXCELLENT! Cache provides >50% improvement")
    elif improvement > 30:
        print(f"\n   ✅ GOOD! Cache provides >30% improvement")
    elif improvement > 0:
        print(f"\n   ✅ Cache is working ({improvement:.1f}% improvement)")
    else:
        print(f"\n   ⚠️  Cache may not be working as expected")
    
    print(f"\n📈 Final Cache Statistics:")
    print(f"   Total Requests: {stats3['total']}")
    print(f"   Cache Hits: {stats3['hits']}")
    print(f"   Cache Misses: {stats3['misses']}")
    print(f"   Hit Rate: {stats3['hit_rate']:.1f}%")
    print(f"   Cache Size: {stats3['size']} items")
    
    print("\n" + "="*70)
    print("✅ Test Complete!")
    print("="*70 + "\n")
    
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

