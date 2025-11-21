from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from fastapi import Request
import json
import traceback
import logging

from models.schemas import ClientErrorPayload  # we might not strictly need this if we stay with Request


router = APIRouter(tags=["System"])
logger = logging.getLogger(__name__)

@router.post("/api/client-error", summary="Log client-side errors")
async def client_error_log(request: Request):
    """
    Receive and log client-side error reports from the frontend ErrorBoundary.
    
    This endpoint captures JavaScript errors that occur in the browser and logs them
    to the server console for debugging and monitoring purposes.
    
    **Request Body Example:**
    ```json
    {
        "message": "Cannot read property 'x' of undefined",
        "stack": "Error: Cannot read property 'x' of undefined\\n    at Component...",
        "componentStack": "    in ErrorComponent\\n    in App",
        "url": "https://example.com/match/123",
        "userAgent": "Mozilla/5.0...",
        "time": "2024-01-15T10:30:00.000Z"
    }
    ```
    
    **Response:**
    ```json
    {
        "status": "ok"
    }
    ```
    
    **Args:**
        request: FastAPI Request object containing error payload
        
    **Returns:**
        dict: Status acknowledgment
        
    **Notes:**
        - Errors are logged to stdout (captured by hosting provider)
        - Maximum 10,000 characters logged per error
        - Non-JSON payloads are handled gracefully
    """
    try:
        payload = await request.json()
    except Exception:
        payload = {"error": "failed to parse client error payload"}
    try:
        # Log to stdout (captured by hosting provider logs)
        print("🔴 Client Error Report:", json.dumps(payload)[:10000])
    except Exception:
        print("🔴 Client Error Report (unserializable payload)")
    return {"status": "ok"}

@router.post("/api/cache/clear", summary="Clear all cache entries")
def clear_cache():
    """
    Clear all entries from the cache and reset metrics.
    
    **Use Cases:**
    - Testing performance without cache
    - Forcing fresh data fetch
    - Debugging cache issues
    
    **Returns:**
        dict: Confirmation message and stats
    """
    from cache import cache
    cache.clear()
    return {"message": "Cache cleared successfully", "stats": cache.get_stats()}

@router.get("/api/cache/stats", summary="Get cache statistics")
def cache_stats():
    """
    Get cache statistics including hit/miss rates and cache size.
    
    **Response Example:**
    ```json
    {
        "backend": "memory",
        "hits": 45,
        "misses": 12,
        "total": 57,
        "hit_rate": 78.95,
        "size": 23,
        "maxsize": 1000,
        "ttl_default": 600
    }
    ```
    
    **Returns:**
        dict: Cache statistics
    """
    from cache import cache
    return cache.get_stats()