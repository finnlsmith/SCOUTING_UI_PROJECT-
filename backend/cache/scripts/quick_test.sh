#!/bin/bash
# Quick test to verify cache is working

echo "🔍 Quick Cache Test"
echo "=================="
echo ""

# Check if server is running
echo "Checking if server is running..."
if curl -s http://localhost:8000/api/cache/stats > /dev/null 2>&1; then
    echo "✅ Server is running!"
    echo ""
    
    # Get initial stats
    echo "📊 Initial cache stats:"
    curl -s http://localhost:8000/api/cache/stats | python3 -m json.tool 2>/dev/null || curl -s http://localhost:8000/api/cache/stats
    echo ""
    
    # Test first call
    echo "📥 Making first request (cache miss)..."
    START=$(date +%s.%N)
    curl -s http://localhost:8000/api/matches > /dev/null
    END=$(date +%s.%N)
    TIME1=$(echo "$END - $START" | bc)
    echo "   Time: ${TIME1}s"
    echo ""
    
    sleep 0.5
    
    # Test second call
    echo "📥 Making second request (cache hit)..."
    START=$(date +%s.%N)
    curl -s http://localhost:8000/api/matches > /dev/null
    END=$(date +%s.%N)
    TIME2=$(echo "$END - $START" | bc)
    echo "   Time: ${TIME2}s"
    echo ""
    
    # Calculate improvement
    if [ -n "$TIME1" ] && [ -n "$TIME2" ]; then
        IMPROVEMENT=$(echo "scale=1; (($TIME1 - $TIME2) / $TIME1) * 100" | bc)
        SPEEDUP=$(echo "scale=2; $TIME1 / $TIME2" | bc)
        echo "📈 Results:"
        echo "   First:  ${TIME1}s (cache miss)"
        echo "   Second: ${TIME2}s (cache hit)"
        echo "   Speedup: ${SPEEDUP}x faster"
        echo "   Improvement: ${IMPROVEMENT}%"
        echo ""
        
        if (( $(echo "$IMPROVEMENT > 50" | bc -l) )); then
            echo "✅ EXCELLENT! Cache working perfectly!"
        elif (( $(echo "$IMPROVEMENT > 0" | bc -l) )); then
            echo "✅ Cache is working!"
        else
            echo "⚠️  Cache may not be working as expected"
        fi
    fi
    
    # Final stats
    echo ""
    echo "📊 Final cache stats:"
    curl -s http://localhost:8000/api/cache/stats | python3 -m json.tool 2>/dev/null || curl -s http://localhost:8000/api/cache/stats
    
else
    echo "❌ Server is not running!"
    echo ""
    echo "Please start the server first:"
    echo "  cd backend"
    echo "  uvicorn app:app --reload"
    echo ""
    echo "Then run this script again."
    exit 1
fi

