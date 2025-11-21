"""
Cache module for Soccer Analytics API.

Provides Redis caching (with in-memory fallback) with TTL support and async S3 operations.
Automatically uses Redis if REDIS_URL is configured, otherwise falls back to in-memory cache.

Exports:
    - cache: RedisCache instance (or InMemoryCache if Redis unavailable)
    - async_s3: AsyncS3Client instance
    - CACHE_TTL: Cache TTL configuration
"""
import os
import logging

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv not available, rely on system env vars

logger = logging.getLogger(__name__)

# Try to use Redis, fallback to in-memory if not available
cache = None
try:
    redis_url = os.getenv("REDIS_URL")
    if redis_url:
        redis_url = redis_url.strip('"').strip("'")
        if redis_url:
            from .redis_cache import RedisCache
            cache = RedisCache(redis_url)
            logger.info("✅ Using Redis cache backend")
        else:
            raise ValueError("REDIS_URL is empty")
    else:
        raise ValueError("REDIS_URL not set")
except Exception as e:
    logger.warning(f"⚠️  Redis not available ({e}), falling back to in-memory cache")
    from .core import InMemoryCache
    from .config import DEFAULT_CACHE_MAXSIZE
    cache = InMemoryCache(maxsize=DEFAULT_CACHE_MAXSIZE)
    logger.info("✅ Using in-memory cache backend")

# Always export these
from .s3_client import async_s3, AsyncS3Client
from .config import CACHE_TTL, DEFAULT_CACHE_MAXSIZE

# Export classes for reference
from .core import InMemoryCache, CacheMetrics
from .redis_cache import RedisCache

__all__ = [
    'cache',
    'async_s3',
    'InMemoryCache',
    'RedisCache',
    'AsyncS3Client',
    'CacheMetrics',
    'CACHE_TTL',
    'DEFAULT_CACHE_MAXSIZE',
]

