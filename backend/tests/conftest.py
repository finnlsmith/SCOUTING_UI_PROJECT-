"""
Shared pytest fixtures for backend route tests.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, MagicMock
import pandas as pd
import io
from moto import mock_aws
import boto3

from app import app


@pytest.fixture
def client():
    """FastAPI test client."""
    return TestClient(app)


@pytest.fixture
def mock_s3():
    """Mock AWS S3 using moto."""
    with mock_aws():
        # Create a mock S3 bucket
        s3 = boto3.client('s3', region_name='us-east-2')
        s3.create_bucket(Bucket='capstone-soccer-data')
        yield s3


@pytest.fixture
def sample_matches_df():
    """Sample matches DataFrame."""
    return pd.DataFrame({
        'match_id': [3788741, 3788742, 3788743],
        'match_date': ['2021-07-11', '2021-07-10', '2021-07-09'],
        'home_team': ['Italy', 'England', 'Spain'],
        'away_team': ['England', 'Denmark', 'Italy'],
        'home_score': [1, 2, 0],
        'away_score': [1, 1, 1],
    })


@pytest.fixture
def sample_events_df():
    """Sample events DataFrame with shots."""
    return pd.DataFrame({
        'type': ['Shot', 'Shot', 'Pass', 'Shot'],
        'team': ['Italy', 'England', 'Italy', 'Italy'],
        'player': ['Player1', 'Player2', 'Player3', 'Player1'],
        'location': [
            '[60, 40]',
            '[100, 50]',
            '[50, 30]',
            '[80, 45]'
        ],
        'shot_outcome': ['Goal', 'Saved', None, 'Off T'],
        'shot_statsbomb_xg': [0.5, 0.3, None, 0.1],
        'period': [1, 1, 1, 2],
        'timestamp': ['00:15:30', '00:25:45', '00:10:20', '00:50:10'],
    })


@pytest.fixture
def mock_cache():
    """Mock cache object."""
    cache_mock = MagicMock()
    cache_mock.get.return_value = None
    cache_mock.set.return_value = None
    cache_mock.clear.return_value = None
    cache_mock.get_stats.return_value = {
        'backend': 'memory',
        'hits': 0,
        'misses': 0,
        'total': 0,
        'hit_rate': 0.0,
        'size': 0,
        'maxsize': 1000,
        'ttl_default': 600
    }
    return cache_mock


@pytest.fixture
def mock_s3_dataframe(mock_s3, sample_matches_df):
    """Upload sample DataFrame to mock S3."""
    csv_buffer = io.StringIO()
    sample_matches_df.to_csv(csv_buffer, index=False)
    mock_s3.put_object(
        Bucket='capstone-soccer-data',
        Key='matches_df.csv',
        Body=csv_buffer.getvalue().encode('utf-8')
    )
    return mock_s3

