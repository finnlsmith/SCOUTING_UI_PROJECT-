#!/bin/bash
# Script to start the server and test caching performance

echo "=========================================="
echo "Cache Performance Test Script"
echo "=========================================="
echo ""

# Check if server is already running
if curl -s http://localhost:8000/api/cache/stats > /dev/null 2>&1; then
    echo "✅ Server is already running!"
else
    echo "⚠️  Server is not running. Please start it in another terminal:"
    echo "   cd backend"
    echo "   # Activate your virtual environment if needed"
    echo "   uvicorn app:app --reload"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo ""
echo "Testing cache performance..."
echo ""

# Test 1: Matches endpoint (first call - cache miss)
echo "=========================================="
echo "TEST 1: /api/matches (First Call - Cache MISS)"
echo "=========================================="
echo "Making first request (this will be slower)..."
time1=$(curl -o /dev/null -s -w "%{time_total}" http://localhost:8000/api/matches)
echo "Response time: ${time1}s"
echo ""

sleep 1

# Test 2: Matches endpoint (second call - cache hit)
echo "=========================================="
echo "TEST 2: /api/matches (Second Call - Cache HIT)"
echo "=========================================="
echo "Making second request (this should be faster)..."
time2=$(curl -o /dev/null -s -w "%{time_total}" http://localhost:8000/api/matches)
echo "Response time: ${time2}s"
echo ""

# Calculate improvement
if [ -n "$time1" ] && [ -n "$time2" ]; then
    improvement=$(echo "scale=2; (($time1 - $time2) / $time1) * 100" | bc)
    speedup=$(echo "scale=2; $time1 / $time2" | bc)
    echo "=========================================="
    echo "PERFORMANCE IMPROVEMENT"
    echo "=========================================="
    echo "First request:  ${time1}s (cache miss)"
    echo "Second request: ${time2}s (cache hit)"
    echo "Speedup:        ${speedup}x faster"
    echo "Improvement:    ${improvement}%"
    echo ""
    
    if (( $(echo "$improvement > 50" | bc -l) )); then
        echo "✅ EXCELLENT! Cache is working great (>50% improvement)"
    elif (( $(echo "$improvement > 30" | bc -l) )); then
        echo "✅ GOOD! Cache is working (>30% improvement)"
    elif (( $(echo "$improvement > 0" | bc -l) )); then
        echo "⚠️  MODERATE improvement (${improvement}%)"
    else
        echo "❌ No improvement - cache may not be working"
    fi
fi

echo ""
echo "=========================================="
echo "Cache Statistics"
echo "=========================================="
curl -s http://localhost:8000/api/cache/stats | python3 -m json.tool 2>/dev/null || curl -s http://localhost:8000/api/cache/stats
echo ""

echo "=========================================="
echo "Test Complete!"
echo "=========================================="

