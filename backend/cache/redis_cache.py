"""
Redis caching implementation using redis-py.
Designed to match InMemoryCache interface for seamless migration.
"""
import os
import logging
import pickle
import json
from typing import Optional, Any
import redis
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

class RedisCache:
    """
    Redis cache implementation matching InMemoryCache interface.
    Uses pickle for complex objects (DataFrames) and JSON for simple types.
    """
    def __init__(self, redis_url: Optional[str] = None):
        """
        Initialize Redis cache client.
        
        Args:
            redis_url: Redis connection URL (defaults to REDIS_URL env var)
        """
        redis_url = redis_url or os.getenv("REDIS_URL")
        if not redis_url:
            raise ValueError("REDIS_URL environment variable not set")
        
        # Remove quotes if present
        redis_url = redis_url.strip('"').strip("'")
        
        try:
            self.client = redis.from_url(redis_url, decode_responses=False)
            # Test connection
            self.client.ping()
            self.metrics = CacheMetrics()
            logger.info("✅ Redis cache initialized (Upstash)")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Redis: {e}")
            raise
    
    def _serialize(self, value: Any) -> bytes:
        """
        Serialize value for Redis storage.
        Uses pickle for complex objects (DataFrames, dicts with complex types),
        JSON for simple types (dicts, lists with primitives).
        
        Args:
            value: Value to serialize
            
        Returns:
            Serialized bytes
        """
        # Try JSON first for simple types (smaller size)
        try:
            if isinstance(value, (dict, list, str, int, float, bool, type(None))):
                # Check if it's a simple dict/list (no complex objects)
                json_str = json.dumps(value)
                # Use a marker to indicate JSON encoding
                return b"JSON:" + json_str.encode('utf-8')
        except (TypeError, ValueError):
            pass
        
        # Use pickle for complex objects (DataFrames, etc.)
        return b"PICKLE:" + pickle.dumps(value, protocol=pickle.HIGHEST_PROTOCOL)
    
    def _deserialize(self, data: bytes) -> Any:
        """
        Deserialize value from Redis storage.
        
        Args:
            data: Serialized bytes
            
        Returns:
            Deserialized value
        """
        if data.startswith(b"JSON:"):
            json_str = data[5:].decode('utf-8')
            return json.loads(json_str)
        elif data.startswith(b"PICKLE:"):
            return pickle.loads(data[7:])
        else:
            # Legacy format (assume pickle)
            return pickle.loads(data)
    
    def _get_memory_usage(self) -> dict:
        """Get Redis memory usage statistics"""
        try:
            info = self.client.info("memory")
            used_memory = info.get('used_memory', 0)
            maxmemory = info.get('maxmemory', 0)
            
            used_mb = used_memory / (1024 * 1024)
            max_mb = maxmemory / (1024 * 1024) if maxmemory > 0 else 0
            
            return {
                "used_mb": round(used_mb, 2),
                "max_mb": round(max_mb, 2) if max_mb > 0 else None,
                "usage_percent": round((used_mb / max_mb * 100), 2) if max_mb > 0 else None
            }
        except Exception as e:
            logger.warning(f"Could not get memory info: {e}")
            return {"used_mb": None, "max_mb": None, "usage_percent": None}
    
    def get(self, key: str, cache_type: str = "default") -> Optional[Any]:
        """
        Get value from cache.
        
        Args:
            key: Cache key
            cache_type: Type of cache (determines TTL, not used for get)
            
        Returns:
            Cached value or None if not found
        """
        try:
            data = self.client.get(key)
            if data is not None:
                value = self._deserialize(data)
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
            
            # Serialize value
            serialized = self._serialize(value)
            
            # Check memory usage before setting (Upstash free tier: 256 MB limit)
            memory_info = self._get_memory_usage()
            if memory_info.get("max_mb") and memory_info.get("used_mb"):
                if memory_info["used_mb"] > memory_info["max_mb"] * 0.9:  # 90% threshold
                    logger.warning(f"⚠️  Redis memory usage high: {memory_info['used_mb']:.1f}MB / {memory_info['max_mb']:.1f}MB")
                    # Could implement LRU eviction here if needed
            
            # Set with TTL
            self.client.setex(key, ttl, serialized)
            logger.debug(f"💾 Cache SET: {key} (ttl={ttl}s, type={cache_type}, size={len(serialized)} bytes)")
        except redis.exceptions.ResponseError as e:
            # Handle memory limit errors
            if "OOM" in str(e) or "out of memory" in str(e).lower():
                logger.error(f"❌ Redis out of memory for key {key}. Consider clearing cache or reducing TTLs.")
            else:
                logger.error(f"Cache set error for {key}: {e}")
        except Exception as e:
            logger.error(f"Cache set error for {key}: {e}")
    
    def delete(self, key: str):
        """Delete key from cache"""
        try:
            deleted = self.client.delete(key)
            if deleted:
                logger.debug(f"🗑️ Cache DELETE: {key}")
        except Exception as e:
            logger.error(f"Cache delete error for {key}: {e}")
    
    def clear(self):
        """Clear all cache entries"""
        try:
            self.client.flushdb()
            self.metrics = CacheMetrics()  # Reset metrics
            logger.info("🧹 Redis cache cleared")
        except Exception as e:
            logger.error(f"Cache clear error: {e}")
    
    def get_stats(self) -> dict:
        """Get cache statistics"""
        stats = self.metrics.get_stats()
        
        # Get Redis-specific stats
        try:
            info = self.client.info("stats")
            keyspace_info = self.client.info("keyspace")
            
            # Count keys
            db_keys = 0
            for db_name, db_info in keyspace_info.items():
                if db_name.startswith("db"):
                    if isinstance(db_info, dict) and "keys" in db_info:
                        db_keys += db_info["keys"]
                    elif isinstance(db_info, str) and "keys" in db_info:
                        db_keys += int(db_info.split(",")[0].split("=")[1])
            
            memory_info = self._get_memory_usage()
            
            stats.update({
                "backend": "redis",
                "size": db_keys,
                "maxsize": "unlimited",  # Redis doesn't have item limit, only memory
                "ttl_default": CACHE_TTL["default"],
                "memory_used_mb": memory_info.get("used_mb"),
                "memory_max_mb": memory_info.get("max_mb"),
                "memory_usage_percent": memory_info.get("usage_percent")
            })
        except Exception as e:
            logger.warning(f"Could not get Redis stats: {e}")
            stats.update({
                "backend": "redis",
                "size": "unknown",
                "maxsize": "unlimited",
                "ttl_default": CACHE_TTL["default"]
            })
        
        return stats

