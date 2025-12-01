# Backend Tests

This directory contains all backend tests for the Soccer Analytics API.

## Structure

```
tests/
├── conftest.py              # Shared pytest fixtures
├── fixtures/                # Test data fixtures
│   ├── match_data.py       # Match-related test data
│   └── event_data.py       # Event-related test data
├── unit/                    # Unit tests (fast, isolated)
│   └── test_utils/         # Utility function tests
└── integration/             # Integration tests (with dependencies)
    └── test_routes/        # API route tests
```

## Running Tests

### Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Run All Tests

```bash
pytest tests/ -v
```

Or using Makefile:

```bash
make test
```

### Run Unit Tests Only

```bash
pytest tests/unit/ -v -m unit
```

Or:

```bash
make test-unit
```

### Run Integration Tests Only

```bash
pytest tests/integration/ -v -m integration
```

Or:

```bash
make test-integration
```

### Run with Coverage

```bash
pytest tests/ --cov=. --cov-report=html --cov-report=term-missing
```

Or:

```bash
make test-coverage
```

Coverage HTML report will be generated in `htmlcov/` directory.

## Test Markers

Tests are marked with pytest markers:

- `@pytest.mark.unit` - Unit tests (fast, isolated)
- `@pytest.mark.integration` - Integration tests (with dependencies)
- `@pytest.mark.slow` - Slow running tests
- `@pytest.mark.requires_aws` - Tests requiring AWS credentials
- `@pytest.mark.requires_redis` - Tests requiring Redis connection

## Fixtures

Common fixtures are defined in `conftest.py`:

- `client` - FastAPI test client
- `mock_s3_client` - Mocked S3 client (using moto)
- `sample_match_df` - Sample matches DataFrame
- `sample_events_df` - Sample events DataFrame
- `mock_cache` - Mock cache object

## Test Data Fixtures

Test data fixtures are in `tests/fixtures/`:

- `match_data.py` - Match-related data helpers
- `event_data.py` - Event-related data helpers

## Writing Tests

### Unit Test Example

```python
import pytest
from utils.coords import _to_xy

@pytest.mark.unit
def test_to_xy_with_valid_json_string():
    location = '[102.5, 35.2]'
    x, y = _to_xy(location)
    assert x == 102.5
    assert y == 35.2
```

### Integration Test Example

```python
import pytest
from unittest.mock import patch

@pytest.mark.integration
def test_list_matches_success(client):
    with patch('routes.matches.s3_client.get_object') as mock_get:
        # Setup mock
        mock_get.return_value = {'Body': csv_buffer}
        
        # Make request
        response = client.get("/api/matches")
        
        # Assert
        assert response.status_code == 200
```

## Mocking Strategy

- **S3**: Use `moto` library or mock `s3_client.get_object()`
- **Cache**: Mock `cache.get()` and `cache.set()` methods
- **External APIs**: Use `responses` library or `unittest.mock`

## Coverage Goals

- **Minimum**: 70% overall coverage
- **Targets**:
  - Routes: 80%
  - Visualizations: 75%
  - Utils: 85%

## Troubleshooting

### Tests fail with import errors

Make sure you're in the `backend/` directory and the Python path includes the backend directory.

### S3 mocking issues

Ensure `moto` is installed and `mock_s3` decorator is used correctly.

### Async test issues

Use `pytest-asyncio` markers or ensure `asyncio_mode = auto` in `pytest.ini`.

