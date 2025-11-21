"""
Cache module for Soccer Analytics API.

Provides in-memory caching with TTL support and async S3 operations.
Designed to be easily upgradeable to Redis later.

Exports:
    - cache: InMemoryCache instance
    - async_s3: AsyncS3Client instance
    - CACHE_TTL: Cache TTL configuration
"""
from .core import cache, InMemoryCache, CacheMetrics
from .s3_client import async_s3, AsyncS3Client
from .config import CACHE_TTL, DEFAULT_CACHE_MAXSIZE

__all__ = [
    'cache',
    'async_s3',
    'InMemoryCache',
    'AsyncS3Client',
    'CacheMetrics',
    'CACHE_TTL',
    'DEFAULT_CACHE_MAXSIZE',
]

