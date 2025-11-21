"""
Async S3 operations with caching support.
Uses aioboto3 for non-blocking S3 calls.
"""
import aioboto3
import asyncio
from io import BytesIO
import pandas as pd
import os
from typing import Optional
import logging

# Import cache from parent module
try:
    from .core import cache
except ImportError:
    try:
        from cache.core import cache
    except ImportError:
        # Fallback for testing
        cache = None

logger = logging.getLogger(__name__)

class AsyncS3Client:
    """
    Async S3 client with built-in caching for DataFrames.
    """
    def __init__(self):
        self.session = aioboto3.Session()
        self.bucket = os.getenv("S3_BUCKET_NAME", "capstone-soccer-data")
        self.region = os.getenv("AWS_REGION", "us-east-2")
        self.timeout = int(os.getenv("S3_TIMEOUT_SECONDS", "30"))
    
    async def get_object(self, key: str) -> Optional[bytes]:
        """
        Async S3 get with timeout.
        
        Args:
            key: S3 object key
            
        Returns:
            Object bytes or None if error
        """
        try:
            async with self.session.client(
                's3',
                region_name=self.region,
                aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
                aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
            ) as s3:
                response = await asyncio.wait_for(
                    s3.get_object(Bucket=self.bucket, Key=key),
                    timeout=self.timeout
                )
                data = await response['Body'].read()
                logger.debug(f"S3 fetched: {key} ({len(data)} bytes)")
                return data
        except asyncio.TimeoutError:
            logger.error(f"⏱️ S3 timeout for {key} after {self.timeout}s")
            raise
        except Exception as e:
            logger.error(f"❌ S3 error for {key}: {e}")
            raise
    
    async def get_dataframe(self, key: str, cache_type: str = "events_df") -> Optional[pd.DataFrame]:
        """
        Get CSV as DataFrame with caching.
        
        Args:
            key: S3 object key (e.g., "events_3788741.csv")
            cache_type: Cache type for TTL determination
            
        Returns:
            DataFrame or None if error
        """
        cache_key = f"s3:df:{key}"
        
        # Check cache first (if available)
        if cache is not None:
            cached_df = cache.get(cache_key, cache_type=cache_type)
            if cached_df is not None:
                return cached_df
        
        # Cache miss - fetch from S3
        try:
            data = await self.get_object(key)
            if data is None:
                return None
            
            df = pd.read_csv(BytesIO(data))
            
            # Cache the DataFrame (if cache available)
            if cache is not None:
                cache.set(cache_key, df, cache_type=cache_type)
            logger.info(f"📥 Loaded and cached: {key}")
            return df
        except Exception as e:
            logger.error(f"Failed to load DataFrame {key}: {e}")
            return None
    
    async def list_objects(self, prefix: str = "") -> list:
        """
        List objects in S3 bucket with prefix.
        
        Args:
            prefix: Object key prefix to filter
            
        Returns:
            List of object keys
        """
        try:
            async with self.session.client(
                's3',
                region_name=self.region,
                aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
                aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
            ) as s3:
                paginator = s3.get_paginator('list_objects_v2')
                files = []
                async for page in paginator.paginate(Bucket=self.bucket, Prefix=prefix):
                    for obj in page.get('Contents', []):
                        files.append(obj['Key'])
                return files
        except Exception as e:
            logger.error(f"Failed to list S3 objects with prefix '{prefix}': {e}")
            import traceback
            traceback.print_exc()
            return []

# Global async client instance
async_s3 = AsyncS3Client()

