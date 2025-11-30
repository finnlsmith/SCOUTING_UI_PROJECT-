"""
Synchronous S3 operations with caching support.
Replaces aioboto3 (which is incompatible with pinned botocore version).
"""
import boto3
from io import BytesIO
import pandas as pd
import os
from typing import Optional, List
import logging

# Import cache
try:
    from .core import cache
except ImportError:
    try:
        from cache.core import cache
    except ImportError:
        cache = None

logger = logging.getLogger(__name__)

class S3Client:
    """
    Sync S3 client with caching for DataFrames.
    """
    def __init__(self):
        self.bucket = os.getenv("S3_BUCKET_NAME", "capstone-soccer-data")
        self.region = os.getenv("AWS_REGION", "us-east-2")

        self.client = boto3.client(
            's3',
            region_name=self.region,
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
        )

    def get_object(self, key: str) -> Optional[bytes]:
        """
        Sync S3 get_object.
        """
        try:
            response = self.client.get_object(Bucket=self.bucket, Key=key)
            data = response["Body"].read()
            logger.debug(f"S3 fetched: {key} ({len(data)} bytes)")
            return data
        except Exception as e:
            logger.error(f"❌ S3 error for {key}: {e}")
            return None

    def get_dataframe(self, key: str, cache_type: str = "events_df") -> Optional[pd.DataFrame]:
        """
        Get CSV as DataFrame with caching.
        """

        cache_key = f"s3:df:{key}"

        # Try cache
        if cache is not None:
            cached_df = cache.get(cache_key, cache_type=cache_type)
            if cached_df is not None:
                return cached_df

        # Cache miss → load from S3
        data = self.get_object(key)
        if data is None:
            return None

        try:
            df = pd.read_csv(BytesIO(data))
        except Exception as e:
            logger.error(f"Failed to parse CSV {key}: {e}")
            return None

        # Save to cache
        if cache is not None:
            cache.set(cache_key, df, cache_type=cache_type)

        logger.info(f"📥 Loaded and cached: {key}")
        return df

    def list_objects(self, prefix: str = "") -> List[str]:
        """
        List objects in the bucket.
        """
        try:
            paginator = self.client.get_paginator('list_objects_v2')
            pages = paginator.paginate(Bucket=self.bucket, Prefix=prefix)

            files = []
            for page in pages:
                for obj in page.get('Contents', []):
                    files.append(obj["Key"])
            return files
        except Exception as e:
            logger.error(f"Failed to list objects with prefix '{prefix}': {e}")
            return []


# Global client instance (replaces async_s3)
s3 = S3Client()
