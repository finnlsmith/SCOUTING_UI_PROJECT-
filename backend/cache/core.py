"""
In-memory caching module using cachetools TTLCache.
Designed to be easily upgradeable to Redis later.
"""
import logging
from typing import Optional, Any
from cachetools import TTLCache
from .config import CACHE_TTL

logger = logging.getLogger(__name__)

class CacheMetrics:
    """Track cache hit/miss statistics"""
    def __init__(self):
        self.hits = 0
        self.misses = 0
    
    def record_hit(self):
        self.hits += 1
    
    def record_miss(self):
        self.misses += 1
    
    def get_hit_rate(self) -> float:
        total = self.hits + self.misses
        return (self.hits / total * 100) if total > 0 else 0.0
    
    def get_stats(self) -> dict:
        total = self.hits + self.misses
        return {
            "hits": self.hits,
            "misses": self.misses,
            "total": total,
            "hit_rate": self.get_hit_rate()
        }

class InMemoryCache:
    """
    In-memory cache using TTLCache.
    Designed with interface that can be swapped for Redis later.
    """
    def __init__(self, maxsize: int = 1000):
        """
        Initialize in-memory cache.
        
        Args:
            maxsize: Maximum number of items to cache (default: 1000)
        """
        self.cache = TTLCache(maxsize=maxsize, ttl=CACHE_TTL["default"])
        self.metrics = CacheMetrics()
        logger.info("✅ In-memory cache initialized (maxsize={})".format(maxsize))
    
    def get(self, key: str, cache_type: str = "default") -> Optional[Any]:
        """
        Get value from cache.
        
        Args:
            key: Cache key
            cache_type: Type of cache (determines TTL)
            
        Returns:
            Cached value or None if not found
        """
        try:
            value = self.cache.get(key)
            if value is not None:
                self.metrics.record_hit()
                logger.debug(f"✅ Cache HIT: {key}")
                return value
            else:
                self.metrics.record_miss()
                logger.debug(f"❌ Cache MISS: {key}")
                return None
        except Exception as e:
            logger.error(f"Cache get error for {key}: {e}")
            self.metrics.record_miss()
            return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None, cache_type: str = "default"):
        """
        Set value in cache with TTL.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds (uses cache_type default if not provided)
            cache_type: Type of cache (determines default TTL)
        """
        try:
            # Use provided TTL or lookup from cache_type
            if ttl is None:
                ttl = CACHE_TTL.get(cache_type, CACHE_TTL["default"])
            
            # TTLCache uses a single TTL for all items, so we need to manage this differently
            # For now, we'll use the default TTL and log the cache_type for future Redis migration
            self.cache[key] = value
            logger.debug(f"💾 Cache SET: {key} (ttl={ttl}s, type={cache_type})")
        except Exception as e:
            logger.error(f"Cache set error for {key}: {e}")
    
    def delete(self, key: str):
        """Delete key from cache"""
        try:
            if key in self.cache:
                del self.cache[key]
                logger.debug(f"🗑️ Cache DELETE: {key}")
        except Exception as e:
            logger.error(f"Cache delete error for {key}: {e}")
    
    def clear(self):
        """Clear all cache entries"""
        try:
            self.cache.clear()
            logger.info("🧹 Cache cleared")
        except Exception as e:
            logger.error(f"Cache clear error: {e}")
    
    def get_stats(self) -> dict:
        """Get cache statistics"""
        stats = self.metrics.get_stats()
        stats.update({
            "backend": "memory",
            "size": len(self.cache),
            "maxsize": self.cache.maxsize,
            "ttl_default": CACHE_TTL["default"]
        })
        return stats

# Global cache instance
from .config import DEFAULT_CACHE_MAXSIZE
cache = InMemoryCache(maxsize=DEFAULT_CACHE_MAXSIZE)

