"""
Integration tests for visualization routes.
Tests: /api/match/{filename}/viz, /api/match/{filename}/passing_network,
       /api/match/{filename}/important_moments, /api/match/{filename}/game_phases,
       /api/match/{filename}/possession_scene
"""
import pytest
from unittest.mock import patch, MagicMock
import plotly.graph_objects as go


@pytest.mark.integration
class TestShotMapRoute:
    """Tests for /api/match/{filename}/viz endpoint."""

    @patch('routes.visualizations.get_match_viz')
    def test_get_match_viz_success(self, mock_get_viz, client):
        """Test successful shot map generation."""
        # Mock Plotly figure
        fig = go.Figure()
        fig.add_trace(go.Scatter(x=[1, 2], y=[3, 4]))
        mock_get_viz.return_value = fig.to_dict()

        response = client.get("/api/match/events_3788741.csv/viz?team=Italy")
        
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "layout" in data
        mock_get_viz.assert_called_once_with(filename="events_3788741.csv", team="Italy")

    @patch('routes.visualizations.get_match_viz')
    def test_get_match_viz_without_team(self, mock_get_viz, client):
        """Test shot map without team filter."""
        fig = go.Figure()
        mock_get_viz.return_value = fig.to_dict()

        response = client.get("/api/match/events_3788741.csv/viz")
        
        assert response.status_code == 200
        mock_get_viz.assert_called_once_with(filename="events_3788741.csv", team=None)

    @patch('routes.visualizations.get_match_viz')
    def test_get_match_viz_file_not_found(self, mock_get_viz, client):
        """Test shot map with file not found."""
        from fastapi import HTTPException
        mock_get_viz.side_effect = HTTPException(status_code=404, detail="File not found")

        response = client.get("/api/match/nonexistent.csv/viz")
        
        assert response.status_code == 404

    @patch('routes.visualizations.get_match_viz')
    def test_get_match_viz_no_shots(self, mock_get_viz, client):
        """Test shot map with no shots in match."""
        from fastapi import HTTPException
        mock_get_viz.side_effect = HTTPException(status_code=404, detail="No shots found")

        response = client.get("/api/match/events_3788741.csv/viz")
        
        assert response.status_code == 404


@pytest.mark.integration
class TestPassingNetworkRoute:
    """Tests for /api/match/{filename}/passing_network endpoint."""

    @patch('routes.visualizations.passing_network_like_matplotlib')
    def test_get_passing_network_success(self, mock_passing_network, client):
        """Test successful passing network generation."""
        fig = go.Figure()
        mock_passing_network.return_value = fig.to_dict()

        response = client.get("/api/match/events_3788741.csv/passing_network?team=Italy&min_passes=2&flip=true")
        
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        mock_passing_network.assert_called_once_with(
            filename="events_3788741.csv",
            team="Italy",
            min_passes=2,
            flip=True
        )

    @patch('routes.visualizations.passing_network_like_matplotlib')
    def test_get_passing_network_missing_team(self, mock_passing_network, client):
        """Test passing network without required team parameter."""
        response = client.get("/api/match/events_3788741.csv/passing_network")
        
        assert response.status_code == 422  # Validation error

    @patch('routes.visualizations.passing_network_like_matplotlib')
    def test_get_passing_network_default_params(self, mock_passing_network, client):
        """Test passing network with default parameters."""
        fig = go.Figure()
        mock_passing_network.return_value = fig.to_dict()

        response = client.get("/api/match/events_3788741.csv/passing_network?team=Italy")
        
        assert response.status_code == 200
        mock_passing_network.assert_called_once_with(
            filename="events_3788741.csv",
            team="Italy",
            min_passes=1,
            flip=False
        )


@pytest.mark.integration
class TestImportantMomentsRoute:
    """Tests for /api/match/{filename}/important_moments endpoint."""

    @patch('routes.visualizations.important_moments')
    def test_get_important_moments_success(self, mock_important_moments, client):
        """Test successful important moments extraction."""
        mock_important_moments.return_value = [
            {
                "who": "Player1",
                "when": "15:30",
                "what": "Shot",
                "outcome": "Goal",
                "xg": 0.5,
                "team": "Italy",
                "period": 1
            }
        ]

        response = client.get("/api/match/events_3788741.csv/important_moments")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["who"] == "Player1"
        mock_important_moments.assert_called_once_with(filename="events_3788741.csv")

    @patch('routes.visualizations.important_moments')
    def test_get_important_moments_empty(self, mock_important_moments, client):
        """Test important moments with no important events."""
        mock_important_moments.return_value = []

        response = client.get("/api/match/events_3788741.csv/important_moments")
        
        assert response.status_code == 200
        data = response.json()
        assert data == []

    @patch('routes.visualizations.important_moments')
    def test_get_important_moments_file_not_found(self, mock_important_moments, client):
        """Test important moments with file not found."""
        from fastapi import HTTPException
        mock_important_moments.side_effect = HTTPException(status_code=500, detail="File not found")

        response = client.get("/api/match/nonexistent.csv/important_moments")
        
        assert response.status_code == 500


@pytest.mark.integration
class TestGamePhasesRoute:
    """Tests for /api/match/{filename}/game_phases endpoint."""

    @patch('routes.visualizations.game_phases')
    def test_get_game_phases_success(self, mock_game_phases, client):
        """Test successful game phases analysis."""
        mock_game_phases.return_value = {
            "phases": [
                {
                    "start_time": "00:00:00",
                    "end_time": "00:45:00",
                    "trigger": "Match Start"
                }
            ],
            "phase_metrics": [
                {
                    "phase": 1,
                    "possession": 55.0,
                    "shots": 5
                }
            ]
        }

        response = client.get("/api/match/events_3788741.csv/game_phases")
        
        assert response.status_code == 200
        data = response.json()
        assert "phases" in data
        assert "phase_metrics" in data
        mock_game_phases.assert_called_once_with(filename="events_3788741.csv")

    @patch('routes.visualizations.game_phases')
    def test_get_game_phases_error(self, mock_game_phases, client):
        """Test game phases with processing error."""
        from fastapi import HTTPException
        mock_game_phases.side_effect = HTTPException(status_code=500, detail="Processing error")

        response = client.get("/api/match/events_3788741.csv/game_phases")
        
        assert response.status_code == 500


@pytest.mark.integration
class TestPossessionSceneRoute:
    """Tests for /api/match/{filename}/possession_scene endpoint."""

    @patch('routes.visualizations.possession_scene')
    def test_get_possession_scene_success(self, mock_possession_scene, client):
        """Test successful possession scene generation."""
        mock_possession_scene.return_value = {
            "image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }

        response = client.get("/api/match/events_3788741.csv/possession_scene?possession=1")
        
        assert response.status_code == 200
        data = response.json()
        assert "image_base64" in data
        mock_possession_scene.assert_called_once_with(
            filename="events_3788741.csv",
            possession=1
        )

    @patch('routes.visualizations.possession_scene')
    def test_get_possession_scene_missing_possession(self, mock_possession_scene, client):
        """Test possession scene without required possession parameter."""
        response = client.get("/api/match/events_3788741.csv/possession_scene")
        
        assert response.status_code == 422  # Validation error

    @patch('routes.visualizations.possession_scene')
    def test_get_possession_scene_invalid_possession(self, mock_possession_scene, client):
        """Test possession scene with invalid possession number."""
        from fastapi import HTTPException
        mock_possession_scene.side_effect = HTTPException(
            status_code=404,
            detail="Possession number not found"
        )

        response = client.get("/api/match/events_3788741.csv/possession_scene?possession=9999")
        
        assert response.status_code == 404

