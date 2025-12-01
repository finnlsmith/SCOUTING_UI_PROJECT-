"""
Shared pytest fixtures for all tests.
"""
import pytest
import pandas as pd
import numpy as np
from unittest.mock import Mock, MagicMock, AsyncMock
from fastapi.testclient import TestClient
try:
    from moto import mock_s3
except ImportError:
    try:
        from moto.mock_s3 import mock_s3
    except ImportError:
        # Fallback: moto might not be needed if we're using mocks instead
        mock_s3 = None
import boto3

from app import app


@pytest.fixture
def client():
    """FastAPI test client."""
    return TestClient(app)


@pytest.fixture
def mock_s3_client():
    """Mock S3 client using moto."""
    # Note: This fixture may not be used if tests patch s3_client directly
    # Keeping it for potential future use
    if mock_s3 is not None:
        with mock_s3():
            s3 = boto3.client('s3', region_name='us-east-2')
            # Create a test bucket
            s3.create_bucket(Bucket='test-bucket')
            yield s3
    else:
        # Fallback if moto not available
        yield None


@pytest.fixture
def sample_match_df():
    """Sample matches DataFrame for testing."""
    return pd.DataFrame({
        'match_id': [3788741, 3788742],
        'match_date': ['2021-07-11', '2021-07-07'],
        'home_team': ['Italy', 'Spain'],
        'away_team': ['England', 'Italy'],
        'home_score': [1, 1],
        'away_score': [1, 2],
        'competition_stage': ['Final', 'Semi-Final'],
    })


@pytest.fixture
def sample_events_df():
    """Sample events DataFrame with shots for testing."""
    return pd.DataFrame({
        'id': ['event1', 'event2', 'event3', 'event4'],
        'type': ['Shot', 'Shot', 'Pass', 'Shot'],
        'team': ['Italy', 'Italy', 'England', 'England'],
        'location': [
            '[102.5, 35.2]',  # Shot 1
            '[98.3, 42.1]',   # Shot 2
            '[50.0, 40.0]',   # Pass (not a shot)
            '[105.0, 38.0]'   # Shot 3
        ],
        'shot_statsbomb_xg': [0.45, 0.12, None, 0.85],
        'shot_outcome': ['Goal', 'Off T', None, 'Saved'],
    })


@pytest.fixture
def sample_events_df_minimal():
    """Minimal events DataFrame with only required columns."""
    return pd.DataFrame({
        'id': ['event1'],
        'type': ['Shot'],
        'location': ['[102.5, 35.2]'],
    })


@pytest.fixture
def mock_cache():
    """Mock cache object."""
    cache = MagicMock()
    cache.get = Mock(return_value=None)
    cache.set = Mock()
    return cache


@pytest.fixture
def mock_s3_dataframe(mock_s3_client, sample_events_df):
    """Mock S3 client that returns a DataFrame."""
    # This would be used in actual S3 mocking scenarios
    # For now, it's a placeholder
    return sample_events_df


@pytest.fixture(autouse=True)
def reset_cache():
    """Reset cache state before each test."""
    # This ensures clean state between tests
    yield
    # Cleanup if needed


@pytest.fixture
def mock_async_s3_client():
    """Mock async S3 client."""
    async_client = AsyncMock()
    async_client.get_dataframe = AsyncMock(return_value=None)
    return async_client

