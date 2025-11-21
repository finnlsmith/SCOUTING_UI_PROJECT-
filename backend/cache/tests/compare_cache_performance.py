#!/usr/bin/env python3
"""
Performance comparison: Cache Enabled vs Cache Disabled
Tests response times and metrics to demonstrate cache benefits.
"""
import requests
import time
import statistics
import json
import sys
import os
from typing import List, Dict

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

BASE_URL = "http://localhost:8000/api"

def format_time(seconds: float) -> str:
    """Format time in readable format"""
    if seconds < 1:
        return f"{seconds*1000:.2f}ms"
    return f"{seconds:.2f}s"

def make_request(endpoint: str, description: str = "") -> Dict:
    """Make a single request and measure time"""
    url = f"{BASE_URL}{endpoint}"
    start = time.time()
    try:
        response = requests.get(url, timeout=30)
        elapsed = time.time() - start
        return {
            "success": response.status_code == 200,
            "time": elapsed,
            "status_code": response.status_code,
            "size": len(response.content) if response.content else 0
        }
    except Exception as e:
        elapsed = time.time() - start
        return {
            "success": False,
            "time": elapsed,
            "error": str(e),
            "size": 0
        }

def run_test_suite(endpoint: str, name: str, num_requests: int = 10) -> Dict:
    """Run a test suite for an endpoint"""
    print(f"\n{'='*70}")
    print(f"Testing: {name}")
    print(f"Endpoint: {endpoint}")
    print(f"Requests: {num_requests}")
    print(f"{'='*70}")
    
    times = []
    successes = 0
    total_size = 0
    
    for i in range(num_requests):
        result = make_request(endpoint, f"Request {i+1}/{num_requests}")
        if result["success"]:
            times.append(result["time"])
            successes += 1
            total_size += result["size"]
        else:
            print(f"  ❌ Request {i+1} failed: {result.get('error', 'Unknown error')}")
        
        # Small delay to avoid overwhelming the server
        if i < num_requests - 1:
            time.sleep(0.1)
    
    if not times:
        return {
            "endpoint": endpoint,
            "name": name,
            "success": False,
            "error": "All requests failed"
        }
    
    avg_time = statistics.mean(times)
    min_time = min(times)
    max_time = max(times)
    median_time = statistics.median(times)
    
    # Calculate requests per second
    rps = 1.0 / avg_time if avg_time > 0 else 0
    
    return {
        "endpoint": endpoint,
        "name": name,
        "success": True,
        "num_requests": num_requests,
        "successful_requests": successes,
        "times": {
            "avg": avg_time,
            "min": min_time,
            "max": max_time,
            "median": median_time,
            "total": sum(times)
        },
        "throughput": {
            "requests_per_second": rps,
            "total_data_mb": total_size / (1024 * 1024)
        }
    }

def test_with_cache_enabled() -> Dict:
    """Test endpoints with cache enabled (normal operation)"""
    print("\n" + "="*70)
    print("TEST 1: WITH CACHE ENABLED (Normal Operation)")
    print("="*70)
    
    # First, clear cache to start fresh
    print("\n📥 Clearing cache to start fresh...")
    try:
        response = requests.post(f"{BASE_URL}/cache/clear", timeout=5)
        if response.status_code == 200:
            print("   ✅ Cache cleared")
        else:
            print(f"   ⚠️  Cache clear returned: {response.status_code}")
    except Exception as e:
        print(f"   ⚠️  Could not clear cache: {e}")
    
    # Warm up cache with first request
    print("🔥 Warming up cache...")
    make_request("/matches", "Warm-up")
    time.sleep(0.5)
    
    results = {}
    
    # Test 1: Matches endpoint
    results["matches"] = run_test_suite("/matches", "Matches List", num_requests=10)
    
    # Test 2: Cache stats
    results["cache_stats"] = run_test_suite("/cache/stats", "Cache Stats", num_requests=5)
    
    # Get final cache stats
    try:
        stats_response = requests.get(f"{BASE_URL}/cache/stats", timeout=5)
        if stats_response.status_code == 200:
            results["final_cache_stats"] = stats_response.json()
    except:
        pass
    
    return results

def test_with_cache_disabled() -> Dict:
    """Test endpoints with cache disabled (simulated by clearing cache before each request)"""
    print("\n" + "="*70)
    print("TEST 2: WITH CACHE DISABLED (Simulated - Clearing cache before each request)")
    print("="*70)
    
    results = {}
    
    # Test 1: Matches endpoint (clear cache before each request)
    print(f"\n{'='*70}")
    print("Testing: Matches List (Cache Cleared Before Each Request)")
    print(f"{'='*70}")
    
    times = []
    successes = 0
    num_requests = 10
    
    for i in range(num_requests):
        # Clear cache before each request to simulate no cache
        try:
            requests.post(f"{BASE_URL}/cache/clear", timeout=2)
        except Exception as e:
            print(f"   ⚠️  Could not clear cache before request {i+1}: {e}")
        
        result = make_request("/matches", f"Request {i+1}/{num_requests}")
        if result["success"]:
            times.append(result["time"])
            successes += 1
        time.sleep(0.1)
    
    if times:
        results["matches"] = {
            "endpoint": "/matches",
            "name": "Matches List (No Cache)",
            "success": True,
            "num_requests": num_requests,
            "successful_requests": successes,
            "times": {
                "avg": statistics.mean(times),
                "min": min(times),
                "max": max(times),
                "median": statistics.median(times),
                "total": sum(times)
            },
            "throughput": {
                "requests_per_second": 1.0 / statistics.mean(times) if times else 0,
                "total_data_mb": 0
            }
        }
    
    # Test 2: Cache stats
    results["cache_stats"] = run_test_suite("/cache/stats", "Cache Stats", num_requests=5)
    
    return results

def compare_results(with_cache: Dict, without_cache: Dict) -> Dict:
    """Compare results and calculate improvements"""
    comparison = {}
    
    # Compare matches endpoint
    if "matches" in with_cache and "matches" in without_cache:
        wc = with_cache["matches"]
        woc = without_cache["matches"]
        
        if wc.get("success") and woc.get("success"):
            wc_avg = wc["times"]["avg"]
            woc_avg = woc["times"]["avg"]
            
            improvement = ((woc_avg - wc_avg) / woc_avg) * 100
            speedup = woc_avg / wc_avg if wc_avg > 0 else 0
            
            comparison["matches"] = {
                "with_cache_avg": wc_avg,
                "without_cache_avg": woc_avg,
                "improvement_percent": improvement,
                "speedup": speedup,
                "time_saved_per_request": woc_avg - wc_avg,
                "time_saved_total": (woc_avg - wc_avg) * 10  # For 10 requests
            }
    
    return comparison

def print_results(with_cache: Dict, without_cache: Dict, comparison: Dict):
    """Print formatted results"""
    print("\n" + "="*70)
    print("PERFORMANCE COMPARISON RESULTS")
    print("="*70)
    
    # With Cache Results
    print("\n📊 WITH CACHE ENABLED:")
    print("-" * 70)
    if "matches" in with_cache and with_cache["matches"].get("success"):
        m = with_cache["matches"]
        print(f"Endpoint: {m['name']}")
        print(f"  Average Response Time: {format_time(m['times']['avg'])}")
        print(f"  Min Response Time:     {format_time(m['times']['min'])}")
        print(f"  Max Response Time:     {format_time(m['times']['max'])}")
        print(f"  Median Response Time:  {format_time(m['times']['median'])}")
        print(f"  Throughput:            {m['throughput']['requests_per_second']:.2f} req/s")
        print(f"  Successful Requests:   {m['successful_requests']}/{m['num_requests']}")
    
    if "final_cache_stats" in with_cache:
        stats = with_cache["final_cache_stats"]
        print(f"\n  Cache Statistics:")
        print(f"    Hits:      {stats.get('hits', 0)}")
        print(f"    Misses:    {stats.get('misses', 0)}")
        print(f"    Hit Rate:  {stats.get('hit_rate', 0):.2f}%")
        print(f"    Cache Size: {stats.get('size', 0)} items")
    
    # Without Cache Results
    print("\n📊 WITHOUT CACHE (Simulated):")
    print("-" * 70)
    if "matches" in without_cache and without_cache["matches"].get("success"):
        m = without_cache["matches"]
        print(f"Endpoint: {m['name']}")
        print(f"  Average Response Time: {format_time(m['times']['avg'])}")
        print(f"  Min Response Time:     {format_time(m['times']['min'])}")
        print(f"  Max Response Time:     {format_time(m['times']['max'])}")
        print(f"  Median Response Time:  {format_time(m['times']['median'])}")
        print(f"  Throughput:            {m['throughput']['requests_per_second']:.2f} req/s")
        print(f"  Successful Requests:   {m['successful_requests']}/{m['num_requests']}")
    
    # Comparison
    if "matches" in comparison:
        print("\n🚀 PERFORMANCE IMPROVEMENT:")
        print("-" * 70)
        c = comparison["matches"]
        print(f"  Average Response Time Improvement: {c['improvement_percent']:.1f}%")
        print(f"  Speedup:                            {c['speedup']:.2f}x faster")
        print(f"  Time Saved Per Request:             {format_time(c['time_saved_per_request'])}")
        print(f"  Total Time Saved (10 requests):     {format_time(c['time_saved_total'])}")
        
        if c['improvement_percent'] > 50:
            print("\n  ✅ EXCELLENT! Cache provides >50% improvement")
        elif c['improvement_percent'] > 30:
            print("\n  ✅ GOOD! Cache provides >30% improvement")
        elif c['improvement_percent'] > 0:
            print("\n  ✅ Cache is working, but improvement could be better")
        else:
            print("\n  ⚠️  Cache may not be working as expected")

def main():
    """Main test function"""
    print("\n" + "="*70)
    print("CACHE PERFORMANCE COMPARISON TEST")
    print("="*70)
    print("\nThis test compares performance with cache enabled vs disabled.")
    print("Make sure the backend server is running on http://localhost:8000")
    print("="*70)
    
    # Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/cache/stats", timeout=5)
        if response.status_code != 200:
            print("\n❌ Server is not responding correctly")
            return 1
    except Exception as e:
        print(f"\n❌ Cannot connect to server: {e}")
        print("Please make sure the backend is running:")
        print("  cd backend")
        print("  source ../venv-backend/bin/activate")
        print("  uvicorn app:app --reload")
        return 1
    
    print("\n✅ Server is running!")
    
    # Run tests
    try:
        with_cache_results = test_with_cache_enabled()
        time.sleep(2)  # Brief pause between test suites
        without_cache_results = test_with_cache_disabled()
        
        # Compare results
        comparison = compare_results(with_cache_results, without_cache_results)
        
        # Print results
        print_results(with_cache_results, without_cache_results, comparison)
        
        # Save results to file
        results = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "with_cache": with_cache_results,
            "without_cache": without_cache_results,
            "comparison": comparison
        }
        
        results_file = os.path.join(os.path.dirname(__file__), "performance_comparison_results.json")
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n💾 Results saved to: {results_file}")
        print("\n" + "="*70)
        print("TEST COMPLETE!")
        print("="*70)
        
        return 0
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
        return 1
    except Exception as e:
        print(f"\n❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())

