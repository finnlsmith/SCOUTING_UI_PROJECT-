# Backend Testing Setup - Quick Start

## ✅ What Has Been Set Up

1. **Pytest Configuration** (`pytest.ini`)
2. **Coverage Configuration** (`.coveragerc`)
3. **Test Directory Structure** (`tests/`)
4. **Shared Fixtures** (`tests/conftest.py`)
5. **Test Data Fixtures** (`tests/fixtures/`)
6. **Sample Unit Tests** (`tests/unit/`)
7. **Sample Integration Tests** (`tests/integration/`)
8. **Makefile** with test commands

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

This will install:
- pytest
- pytest-asyncio
- pytest-cov
- pytest-mock
- httpx
- faker
- moto (for S3 mocking)
- And other testing dependencies

### 2. Verify Installation

```bash
pytest --version
```

### 3. Run Tests

```bash
# Run all tests
pytest tests/ -v

# Or using Makefile
make test

# Run unit tests only
make test-unit

# Run integration tests only
make test-integration

# Run with coverage report
make test-coverage
```

## 📁 Test Structure

```
backend/tests/
├── conftest.py                    # Shared fixtures
├── fixtures/                      # Test data
│   ├── match_data.py             # Match fixtures
│   └── event_data.py             # Event fixtures
├── unit/                          # Unit tests
│   └── test_utils/
│       ├── test_coords.py        # Coordinate utility tests
│       └── test_pitch.py         # Pitch utility tests
└── integration/                   # Integration tests
    └── test_routes/
        ├── test_matches.py       # Match route tests
        └── test_visualizations.py # Visualization route tests
```

## 📝 Test Examples

### Unit Test Example

```python
@pytest.mark.unit
def test_to_xy_with_valid_json_string():
    location = '[102.5, 35.2]'
    x, y = _to_xy(location)
    assert x == 102.5
    assert y == 35.2
```

### Integration Test Example

```python
@pytest.mark.integration
def test_list_matches_success(client):
    with patch('routes.matches.s3_client') as mock_s3:
        # Setup mock...
        response = client.get("/api/matches")
        assert response.status_code == 200
```

## 🎯 Next Steps

1. **Install dependencies** (see above)
2. **Run the sample tests** to verify setup works
3. **Add more tests** following the patterns in existing tests
4. **Aim for 70% coverage** (currently at 0%, but foundation is ready)

## 📊 Current Test Coverage

- ✅ Utility functions: `test_coords.py`, `test_pitch.py`
- ✅ Route integration: `test_matches.py`, `test_visualizations.py`
- ⏳ More tests needed for full coverage

## 🔧 Troubleshooting

### Import Errors

Make sure you're in the `backend/` directory:
```bash
cd backend
pytest tests/ -v
```

### S3 Mocking Issues

Tests use `moto` library for S3 mocking. If issues occur:
- Ensure `moto` is installed: `pip install moto`
- Check that `@mock_s3` decorator is used correctly

### Async Test Issues

Ensure `pytest-asyncio` is installed and `asyncio_mode = auto` in `pytest.ini`.

## 📚 Documentation

See `tests/README.md` for detailed testing documentation.

