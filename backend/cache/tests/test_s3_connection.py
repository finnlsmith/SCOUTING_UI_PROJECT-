#!/usr/bin/env python3
"""Test S3 connection and see actual errors"""
import os
import sys
import boto3
from dotenv import load_dotenv

# Load .env
load_dotenv()

print("=" * 60)
print("S3 Connection Test")
print("=" * 60)
print()

# Check environment variables
print("Environment Variables:")
print(f"  AWS_REGION: {os.getenv('AWS_REGION', 'NOT SET')}")
print(f"  S3_BUCKET_NAME: {os.getenv('S3_BUCKET_NAME', 'NOT SET')}")
print(f"  AWS_ACCESS_KEY_ID: {'SET' if os.getenv('AWS_ACCESS_KEY_ID') else 'NOT SET'}")
print(f"  AWS_SECRET_ACCESS_KEY: {'SET' if os.getenv('AWS_SECRET_ACCESS_KEY') else 'NOT SET'}")
print()

# Test S3 connection
try:
    print("Testing S3 connection...")
    s3 = boto3.client(
        's3',
        region_name=os.getenv('AWS_REGION', 'us-east-2'),
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
    )
    
    bucket = os.getenv('S3_BUCKET_NAME', 'capstone-soccer-data')
    
    # Test bucket access
    print(f"Checking bucket: {bucket}")
    s3.head_bucket(Bucket=bucket)
    print("✅ Bucket exists and is accessible")
    
    # Try to list objects
    print("\nListing objects in bucket...")
    response = s3.list_objects_v2(Bucket=bucket, MaxKeys=5)
    if 'Contents' in response:
        print(f"✅ Found {len(response['Contents'])} objects (showing first 5):")
        for obj in response['Contents'][:5]:
            print(f"   - {obj['Key']}")
    else:
        print("⚠️  Bucket is empty or no objects found")
    
    # Try to get matches_df.csv
    print("\nTesting matches_df.csv access...")
    try:
        obj = s3.get_object(Bucket=bucket, Key='matches_df.csv')
        print(f"✅ matches_df.csv exists ({obj['ContentLength']} bytes)")
    except s3.exceptions.NoSuchKey:
        print("❌ matches_df.csv not found in bucket")
    except Exception as e:
        print(f"❌ Error accessing matches_df.csv: {e}")
    
except Exception as e:
    print(f"❌ S3 Connection Error: {type(e).__name__}")
    print(f"   {e}")
    import traceback
    traceback.print_exc()

