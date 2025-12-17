"""
Integration tests for system routes.
Tests: POST /api/client-error, POST /api/cache/clear, GET /api/cache/stats
"""
import pytest
from unittest.mock import patch, MagicMock


@pytest.mark.integration
class TestClientErrorRoute:
    """Tests for /api/client-error endpoint."""

    def test_log_client_error_success(self, client):
        """Test successful client error logging."""
        error_payload = {
            "message": "Test error",
            "stack": "Error: Test error\n    at test.js:1",
            "componentStack": "    in TestComponent",
            "url": "http://localhost:3000/test",
            "userAgent": "Mozilla/5.0",
            "time": "2024-01-01T00:00:00.000Z"
        }

        response = client.post("/api/client-error", json=error_payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"

    def test_log_client_error_invalid_json(self, client):
        """Test client error with invalid JSON."""
        # Send invalid JSON
        response = client.post(
            "/api/client-error",
            data="not json",
            headers={"Content-Type": "application/json"}
        )
        
        # Should still return 200 (graceful handling)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"

    def test_log_client_error_empty_payload(self, client):
        """Test client error with empty payload."""
        response = client.post("/api/client-error", json={})
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"

    def test_log_client_error_large_payload(self, client):
        """Test client error with very large payload (should truncate)."""
        large_stack = "Error: " + "x" * 20000  # Very large stack trace
        error_payload = {
            "message": "Large error",
            "stack": large_stack,
            "url": "http://localhost:3000/test"
        }

        response = client.post("/api/client-error", json=error_payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"


@pytest.mark.integration
class TestCacheClearRoute:
    """Tests for /api/cache/clear endpoint."""

    @patch('cache.cache')
    def test_clear_cache_success(self, mock_cache, client):
        """Test successful cache clearing."""
        mock_cache.get_stats.return_value = {
            "backend": "memory",
            "hits": 10,
            "misses": 5,
            "total": 15,
            "hit_rate": 66.67,
            "size": 3,
            "maxsize": 1000,
            "ttl_default": 600
        }

        response = client.post("/api/cache/clear")
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Cache cleared successfully"
        assert "stats" in data
        assert mock_cache.clear.called_once()

    @patch('cache.cache')
    def test_clear_cache_returns_stats(self, mock_cache, client):
        """Test that cache clear returns updated stats."""
        mock_cache.get_stats.return_value = {
            "backend": "memory",
            "hits": 0,
            "misses": 0,
            "total": 0,
            "hit_rate": 0.0,
            "size": 0,
            "maxsize": 1000,
            "ttl_default": 600
        }

        response = client.post("/api/cache/clear")
        data = response.json()
        
        assert "stats" in data
        assert data["stats"]["size"] == 0  # Should be empty after clear


@pytest.mark.integration
class TestCacheStatsRoute:
    """Tests for /api/cache/stats endpoint."""

    @patch('cache.cache')
    def test_get_cache_stats_success(self, mock_cache, client):
        """Test successful cache stats retrieval."""
        expected_stats = {
            "backend": "memory",
            "hits": 45,
            "misses": 12,
            "total": 57,
            "hit_rate": 78.95,
            "size": 23,
            "maxsize": 1000,
            "ttl_default": 600
        }
        mock_cache.get_stats.return_value = expected_stats

        response = client.get("/api/cache/stats")
        
        assert response.status_code == 200
        data = response.json()
        assert data == expected_stats
        assert data["backend"] == "memory"
        assert data["hits"] == 45
        assert data["misses"] == 12
        assert "hit_rate" in data

    @patch('cache.cache')
    def test_get_cache_stats_empty_cache(self, mock_cache, client):
        """Test cache stats with empty cache."""
        mock_cache.get_stats.return_value = {
            "backend": "memory",
            "hits": 0,
            "misses": 0,
            "total": 0,
            "hit_rate": 0.0,
            "size": 0,
            "maxsize": 1000,
            "ttl_default": 600
        }

        response = client.get("/api/cache/stats")
        data = response.json()
        
        assert data["size"] == 0
        assert data["total"] == 0
        assert data["hit_rate"] == 0.0

    @patch('cache.cache')
    def test_get_cache_stats_redis_backend(self, mock_cache, client):
        """Test cache stats with Redis backend."""
        mock_cache.get_stats.return_value = {
            "backend": "redis",
            "hits": 100,
            "misses": 20,
            "total": 120,
            "hit_rate": 83.33,
            "size": 50,
            "maxsize": None,
            "ttl_default": 600
        }

        response = client.get("/api/cache/stats")
        data = response.json()
        
        assert data["backend"] == "redis"
        assert data["maxsize"] is None  # Redis has no maxsize

