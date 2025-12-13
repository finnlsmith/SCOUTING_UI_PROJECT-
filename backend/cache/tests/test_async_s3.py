#!/usr/bin/env python3
"""Test async S3 client used by the app"""
import asyncio
import sys
import os
# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from cache import async_s3

async def test():
    print("=" * 60)
    print("Async S3 Client Test")
    print("=" * 60)
    print()
    
    # Test getting matches_df.csv
    print("Testing get_dataframe('matches_df.csv')...")
    try:
        df = await async_s3.get_dataframe("matches_df.csv", cache_type="matches_df")
        if df is not None:
            print(f"✅ Successfully loaded DataFrame")
            print(f"   Shape: {df.shape}")
            print(f"   Columns: {list(df.columns)[:5]}...")
        else:
            print("❌ Returned None")
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}")
        print(f"   {e}")
        import traceback
        traceback.print_exc()
    
    print()
    print("Testing list_objects()...")
    try:
        files = await async_s3.list_objects(prefix='')
        csv_files = [f for f in files if f.endswith('.csv')]
        print(f"✅ Found {len(csv_files)} CSV files")
        print(f"   First 5: {csv_files[:5]}")
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}")
        print(f"   {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())

