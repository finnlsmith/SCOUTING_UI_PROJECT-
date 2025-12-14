"""
Integration tests for visualization API routes.
"""
import pytest
from unittest.mock import patch, MagicMock, Mock
from tests.fixtures.event_data import get_sample_events_df, get_sample_shots_only_df
from tests.fixtures.match_data import get_sample_matches_df


@pytest.mark.integration
class TestVizRoute:
    """Test the /api/match/{filename}/viz endpoint."""
    
    @patch('cache.s3')
    @patch('cache.cache')
    def test_get_match_viz_success(self, mock_cache, mock_s3, client):
        """Test successful shot map generation."""
        # Arrange
        shots_df = get_sample_shots_only_df()
        matches_df = get_sample_matches_df()
        
        # Mock cache
        mock_cache.get = Mock(return_value=None)
        mock_cache.set = Mock()
        
        # Mock S3 get_dataframe
        def s3_side_effect(key, cache_type=None):
            if key == "matches_df.csv":
                return matches_df
            return shots_df
        
        mock_s3.get_dataframe = Mock(side_effect=s3_side_effect)
        
        # Act
        response = client.get("/api/match/events_3788741.csv/viz")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert 'data' in data or 'meta' in data  # Plotly figure structure
    
    @patch('cache.s3')
    @patch('cache.cache')
    def test_get_match_viz_file_not_found(self, mock_cache, mock_s3, client):
        """Test handling when file doesn't exist in S3."""
        # Arrange
        mock_cache.get = Mock(return_value=None)
        mock_s3.get_dataframe = Mock(return_value=None)
        
        # Act
        response = client.get("/api/match/nonexistent.csv/viz")
        
        # Assert
        assert response.status_code == 404
    
    @patch('cache.s3')
    @patch('cache.cache')
    def test_get_match_viz_no_shots(self, mock_cache, mock_s3, client):
        """Test handling when match has no shot events."""
        # Arrange
        from tests.fixtures.event_data import get_events_without_shots
        
        mock_cache.get = Mock(return_value=None)
        mock_s3.get_dataframe = Mock(return_value=get_events_without_shots())
        
        # Act
        response = client.get("/api/match/events_3788741.csv/viz")
        
        # Assert
        assert response.status_code == 404
        assert "No shot events" in response.json()['detail']


@pytest.mark.integration
class TestImportantMomentsRoute:
    """Test the /api/match/{filename}/important_moments endpoint."""
    
    @patch('cache.s3')
    @patch('cache.cache')
    def test_get_important_moments_success(self, mock_cache, mock_s3, client):
        """Test successful important moments extraction."""
        # Arrange
        events_df = get_sample_events_df()
        mock_cache.get = Mock(return_value=None)
        mock_s3.get_dataframe = Mock(return_value=events_df)
        
        # Act
        response = client.get("/api/match/events_3788741.csv/important_moments")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    @patch('cache.s3')
    @patch('cache.cache')
    def test_get_important_moments_file_not_found(self, mock_cache, mock_s3, client):
        """Test handling when file doesn't exist."""
        # Arrange
        mock_cache.get = Mock(return_value=None)
        mock_s3.get_dataframe = Mock(return_value=None)
        
        # Act
        response = client.get("/api/match/nonexistent.csv/important_moments")
        
        # Assert
        assert response.status_code == 404

