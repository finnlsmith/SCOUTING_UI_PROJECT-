# Comprehensive Testing Plan

## Overview

This document outlines the complete testing strategy for the Columbia MSDS Soccer Analytics application. The goal is to achieve **70% backend code coverage**, comprehensive frontend component testing, and end-to-end testing of critical user flows with automated CI/CD integration.

---

## Testing Architecture

```
Testing Pyramid
─────────────────────────
│    E2E Tests          │  ← Playwright/Cypress (Critical flows)
│    (Few, Slow)        │
├───────────────────────┤
│  Integration Tests    │  ← API + DB integration
│   (Some, Medium)      │
├───────────────────────┤
│   Unit Tests          │  ← Components, Functions, Hooks
│  (Many, Fast)         │
└───────────────────────┘
```

---

## Phase 1: Backend Testing Setup

### 1.1 Dependencies & Configuration

**Files to Create/Modify:**
- `backend/requirements.txt` - Add testing dependencies
- `backend/pytest.ini` - Pytest configuration
- `backend/.coveragerc` - Coverage configuration
- `backend/conftest.py` - Shared fixtures

**Dependencies to Add:**
```python
# Testing Framework
pytest==7.4.3
pytest-asyncio==0.21.1
pytest-cov==4.1.0
pytest-mock==3.12.0

# Test Utilities
httpx==0.25.2  # For async FastAPI testing
faker==20.1.0  # For generating test data
freezegun==1.2.2  # For time-based tests
responses==0.24.1  # For mocking HTTP requests

# Code Quality
pytest-xdist==3.5.0  # Parallel test execution
pytest-timeout==2.2.0  # Test timeout handling
```

**pytest.ini Configuration:**
```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
asyncio_mode = auto
asyncio_default_fixture_loop_scope = function
addopts = 
    --cov=.
    --cov-report=html
    --cov-report=term-missing
    --cov-report=xml
    --cov-fail-under=70
    --strict-markers
    -v
markers =
    unit: Unit tests (fast, isolated)
    integration: Integration tests (slower, with dependencies)
    slow: Slow running tests
    requires_aws: Tests that require AWS credentials
    requires_redis: Tests that require Redis connection
```

**Coverage Configuration (.coveragerc):**
```ini
[run]
source = .
omit = 
    */tests/*
    */test_*.py
    */__pycache__/*
    */venv/*
    */.*venv/*
    */cache/tests/*
    setup.py

[report]
exclude_lines =
    pragma: no cover
    def __repr__
    raise AssertionError
    raise NotImplementedError
    if __name__ == .__main__.:
    if TYPE_CHECKING:
    @abstractmethod
```

### 1.2 Test Structure

```
backend/
├── tests/
│   ├── __init__.py
│   ├── conftest.py                    # Shared fixtures
│   ├── fixtures/                      # Test data fixtures
│   │   ├── __init__.py
│   │   ├── match_data.py              # Sample match data
│   │   ├── event_data.py              # Sample event data
│   │   ├── api_responses.py           # Mock API responses
│   │   └── s3_data.py                 # Mock S3 data
│   │
│   ├── unit/                          # Unit tests (fast, isolated)
│   │   ├── __init__.py
│   │   ├── test_utils/                # Utility function tests
│   │   │   ├── test_coords.py
│   │   │   └── test_pitch.py
│   │   ├── test_models/               # Model tests
│   │   │   └── test_schemas.py
│   │   └── test_visualizations/       # Visualization logic tests
│   │       ├── test_shot_map.py
│   │       ├── test_passing_network.py
│   │       ├── test_important_moments.py
│   │       ├── test_game_phases.py
│   │       └── test_possession_scene.py
│   │
│   ├── integration/                   # Integration tests
│   │   ├── __init__.py
│   │   ├── test_routes/               # API endpoint tests
│   │   │   ├── test_matches.py
│   │   │   ├── test_visualizations.py
│   │   │   └── test_system.py
│   │   ├── test_cache/                # Cache integration tests
│   │   │   └── test_cache_integration.py
│   │   └── test_s3/                   # S3 integration tests
│   │       └── test_s3_integration.py
│   │
│   └── e2e/                           # End-to-end API tests
│       ├── __init__.py
│       └── test_api_flows.py          # Full API workflows
```

### 1.3 Test Fixtures

**Fixtures to Create:**

1. **`conftest.py`** - Core fixtures:
   - `app` - FastAPI test client
   - `client` - HTTPX async client
   - `mock_s3_client` - Mocked S3 client
   - `mock_redis` - Mocked Redis cache
   - `sample_match_df` - Pandas DataFrame with match data
   - `sample_events_df` - Pandas DataFrame with event data
   - `sample_360_frames_df` - Pandas DataFrame with 360 frames

2. **`fixtures/match_data.py`**:
   - Sample match metadata
   - Match list responses
   - Team names and IDs

3. **`fixtures/event_data.py`**:
   - Sample shot events
   - Sample pass events
   - Sample card events
   - Sample goal events

4. **`fixtures/api_responses.py`**:
   - Mock API responses for each endpoint
   - Error responses
   - Empty data responses

### 1.4 Test Coverage Targets

**Priority 1 (Must Have - 70% minimum):**
- ✅ All route handlers (routes/*.py)
- ✅ All visualization functions (visualizations/*.py)
- ✅ Core utilities (utils/*.py)
- ✅ Cache logic (cache/core.py, cache/s3_client.py)

**Priority 2 (Should Have):**
- Configuration validation (config/settings.py)
- Error handling paths
- Edge cases in data processing

**Priority 3 (Nice to Have):**
- Cache warmup logic
- Startup events

---

## Phase 2: Frontend Testing Setup

### 2.1 Dependencies & Configuration

**Dependencies Already Installed:**
- ✅ `@testing-library/react`
- ✅ `@testing-library/jest-dom`
- ✅ `@testing-library/user-event`

**Dependencies to Add:**
```json
{
  "devDependencies": {
    "@testing-library/jest-dom": "^6.9.1",  // Already installed
    "@testing-library/react-hooks": "^8.0.1",  // For hook testing
    "jest-environment-jsdom": "^29.7.0",  // Explicit JSDOM setup
    "msw": "^2.0.0",  // Mock Service Worker for API mocking
    "@mswjs/data": "^2.0.0"  // For MSW data modeling
  }
}
```

**Update `setupTests.js`:**
```javascript
import '@testing-library/jest-dom';
import { server } from './mocks/server';

// Establish API mocking before all tests
beforeAll(() => server.listen());

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Clean up after all tests
afterAll(() => server.close());
```

### 2.2 Test Structure

```
frontend/src/
├── __mocks__/                         # Manual mocks
│   ├── plotly.js                      # Mock Plotly
│   └── fileMock.js                    # Mock files
│
├── mocks/                             # MSW handlers
│   ├── handlers.js                    # API mock handlers
│   └── server.js                      # MSW server setup
│
└── tests/                             # Test utilities
    ├── utils/
    │   ├── test-utils.jsx             # Custom render function
    │   └── fixtures.js                # Test data fixtures
    │
    └── components/                    # Component tests
        ├── MatchViz/
        │   ├── MatchViz.test.js
        │   ├── KeyMomentsSection.test.js
        │   ├── GamePhasesSection.test.js
        │   └── __mocks__/
        ├── MatchSelector/
        │   └── MatchSelector.test.js
        ├── Scoreboard/
        │   └── Scoreboard.test.js
        ├── ErrorBanner/
        │   └── ErrorBanner.test.js
        └── hooks/
            ├── useMatchData.test.js
            ├── useVisualization.test.js
            └── useUpload.test.js
```

### 2.3 Mock Service Worker Setup

**Purpose**: Mock API responses for component tests

**Files to Create:**
- `src/mocks/handlers.js` - API response handlers
- `src/mocks/server.js` - MSW server configuration

**Example Handler:**
```javascript
import { rest } from 'msw';

export const handlers = [
  rest.get('/api/matches', (req, res, ctx) => {
    return res(ctx.json([
      { file: 'events_3788741.csv', label: 'Italy vs England' }
    ]));
  }),
  rest.get('/api/match/:filename/viz', (req, res, ctx) => {
    return res(ctx.json({
      data: [],
      layout: {},
      meta: {}
    }));
  }),
];
```

### 2.4 Component Test Coverage

**Priority 1 Components (Must Test):**
- `MatchViz/index.js` - Main visualization component
- `MatchSelector` - Match selection logic
- `Scoreboard` - Data display
- `ErrorBanner` - Error handling

**Priority 2 Components:**
- `KeyMomentsSection` - Moment display
- `GamePhasesSection` - Phase display
- All SVG components (PitchSVG, EventMapSVG, etc.)

**Priority 3 Components:**
- Layout components
- Theme toggle
- Navigation components

### 2.5 Hook Testing

**Hooks to Test:**
- `useMatchData` - Match list fetching
- `useVisualization` - Visualization loading
- `useUpload` - File upload logic
- `useGamePhases` - Game phases fetching

**Testing Strategy:**
- Use `@testing-library/react-hooks`
- Test loading states
- Test error states
- Test data transformations

---

## Phase 3: End-to-End Testing

### 3.1 Framework Selection: Playwright

**Rationale:**
- Better browser automation
- Built-in test runner
- Better debugging tools
- Multi-browser support out of the box

**Alternative Considered:**
- Cypress (more popular, but Playwright is faster and more modern)

### 3.2 Playwright Setup

**Dependencies to Add:**
```json
{
  "devDependencies": {
    "@playwright/test": "^1.40.0"
  }
}
```

**Configuration: `playwright.config.js`**
```javascript
module.exports = {
  testDir: './e2e',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run start',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
};
```

### 3.3 E2E Test Structure

```
e2e/
├── fixtures/                          # E2E test data
│   └── match-data.json
│
├── pages/                             # Page Object Models
│   ├── MatchVizPage.js
│   └── LandingPage.js
│
├── flows/                             # User flow tests
│   ├── match-selection.spec.js
│   ├── visualization.spec.js
│   └── error-handling.spec.js
│
└── helpers/                           # E2E utilities
    ├── api-helpers.js                 # Backend API helpers
    └── test-helpers.js                # Common test utilities
```

### 3.4 Critical User Flows to Test

**Flow 1: Match Selection → Visualization**
```
1. Navigate to Match Viz page
2. Select a match from dropdown
3. Verify match data loads
4. Verify scoreboard displays
5. Click "Shot map - Home Team" button
6. Verify shot map renders
```

**Flow 2: Error Handling**
```
1. Simulate API error
2. Verify error banner displays
3. Verify error message is shown
4. Test error dismissal
```

**Flow 3: Multiple Visualizations**
```
1. Load match
2. View shot map
3. Switch to passing network
4. Switch to key moments
5. Verify all load correctly
```

**Flow 4: Game Phases Navigation**
```
1. Load match with phases
2. Scroll to game phases section
3. Verify phases display
4. Verify phase metrics render
5. Verify event maps display
```

---

## Phase 4: Test Fixtures & Data

### 4.1 Backend Fixtures

**Location: `backend/tests/fixtures/`**

**Files to Create:**

1. **`match_data.py`**:
   - Sample matches DataFrame
   - Match metadata dictionaries
   - Team names and IDs

2. **`event_data.py`**:
   - Sample shot events
   - Sample pass events
   - Complete event sequences
   - Edge cases (empty data, malformed data)

3. **`api_responses.py`**:
   - Mock Plotly figure JSON
   - Mock important moments response
   - Mock game phases response
   - Error responses

4. **`s3_data.py`**:
   - Mock CSV file contents
   - Mock S3 responses
   - Mock DataFrame objects

### 4.2 Frontend Fixtures

**Location: `frontend/src/tests/fixtures.js`**

**Data to Mock:**
- Match list responses
- Visualization data (Plotly figures)
- Error responses
- Loading states

---

## Phase 5: CI/CD Integration

### 5.1 GitHub Actions Workflow

**File: `.github/workflows/test.yml`**

**Workflow Steps:**

1. **Setup**
   - Checkout code
   - Set up Python 3.11
   - Set up Node.js 20.x
   - Cache dependencies

2. **Backend Tests**
   - Install Python dependencies
   - Run pytest with coverage
   - Upload coverage reports
   - Fail if coverage < 70%

3. **Frontend Tests**
   - Install npm dependencies
   - Run React tests
   - Generate coverage reports
   - Upload coverage reports

4. **E2E Tests**
   - Install Playwright browsers
   - Start backend server (background)
   - Start frontend server (background)
   - Wait for servers to be ready
   - Run Playwright tests
   - Upload test artifacts (screenshots, videos)

5. **Report**
   - Comment PR with coverage
   - Upload test artifacts
   - Set status checks

### 5.2 Environment Variables for CI

```yaml
env:
  AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
  AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
  S3_BUCKET_NAME: test-bucket
  REDIS_URL: ${{ secrets.REDIS_URL }}
  # Use mock/test credentials for CI
```

### 5.3 Test Scripts

**Add to `backend/Makefile`:**
```makefile
.PHONY: test
test:
	pytest tests/ -v

.PHONY: test-unit
test-unit:
	pytest tests/unit/ -v -m unit

.PHONY: test-integration
test-integration:
	pytest tests/integration/ -v -m integration

.PHONY: test-coverage
test-coverage:
	pytest tests/ --cov=. --cov-report=html --cov-report=term

.PHONY: test-watch
test-watch:
	pytest-watch tests/
```

**Update `frontend/package.json` scripts:**
```json
{
  "scripts": {
    "test": "react-app-rewired test --coverage --watchAll=false",
    "test:watch": "react-app-rewired test",
    "test:ci": "CI=true react-app-rewired test --coverage --watchAll=false",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

**Add to root `Makefile`:**
```makefile
.PHONY: test
test:
	cd backend && make test
	cd frontend && npm run test:ci

.PHONY: test-e2e
test-e2e:
	cd frontend && npm run test:e2e

.PHONY: test-all
test-all: test test-e2e
```

---

## Phase 6: Documentation

### 6.1 Testing Documentation Files

**Files to Create:**

1. **`TESTING.md`** (Root level)
   - Testing overview
   - How to run tests
   - Coverage requirements
   - Test conventions

2. **`backend/tests/README.md`**
   - Backend testing guide
   - Fixture documentation
   - Mock patterns

3. **`frontend/src/tests/README.md`**
   - Frontend testing guide
   - Component testing patterns
   - Mock Service Worker usage

4. **`e2e/README.md`**
   - E2E testing guide
   - Page Object Model pattern
   - Running E2E tests locally

### 6.2 Update Main README

**Add Testing Section:**
```markdown
## Testing

### Running Tests

**Backend:**
```bash
cd backend
pytest tests/ -v
```

**Frontend:**
```bash
cd frontend
npm test
```

**E2E:**
```bash
cd frontend
npm run test:e2e
```

### Coverage

- Backend: Minimum 70% code coverage required
- Frontend: All components must have render tests
- E2E: Critical user flows must be covered

See [TESTING.md](./TESTING.md) for detailed testing guidelines.
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Set up pytest configuration
- [ ] Create test directory structure
- [ ] Create core fixtures (`conftest.py`)
- [ ] Set up coverage reporting
- [ ] Write first unit test (example)

### Phase 2: Backend Unit Tests (Week 2)
- [ ] Test utility functions (coords, pitch)
- [ ] Test visualization functions
- [ ] Test models/schemas
- [ ] Achieve 50% coverage

### Phase 3: Backend Integration Tests (Week 2-3)
- [ ] Test API routes
- [ ] Test cache integration
- [ ] Test S3 integration (mocked)
- [ ] Achieve 70% coverage

### Phase 4: Frontend Setup (Week 3)
- [ ] Set up MSW (Mock Service Worker)
- [ ] Create API mock handlers
- [ ] Set up test utilities
- [ ] Create component test structure

### Phase 5: Frontend Component Tests (Week 3-4)
- [ ] Test MatchViz component
- [ ] Test MatchSelector
- [ ] Test Scoreboard
- [ ] Test ErrorBanner
- [ ] Test custom hooks

### Phase 6: E2E Setup (Week 4)
- [ ] Install and configure Playwright
- [ ] Create page objects
- [ ] Set up test fixtures
- [ ] Write first E2E test

### Phase 7: E2E Critical Flows (Week 4-5)
- [ ] Match selection flow
- [ ] Visualization flow
- [ ] Error handling flow
- [ ] Game phases flow

### Phase 8: CI/CD Integration (Week 5)
- [ ] Create GitHub Actions workflow
- [ ] Configure test scripts
- [ ] Set up coverage reporting
- [ ] Add PR status checks

### Phase 9: Documentation (Week 5)
- [ ] Write TESTING.md
- [ ] Document test conventions
- [ ] Update README
- [ ] Create test examples

### Phase 10: Polish & Optimization (Week 6)
- [ ] Improve test performance
- [ ] Add missing test cases
- [ ] Fix flaky tests
- [ ] Achieve coverage goals

---

## Test Coverage Goals

### Backend Coverage Targets

| Module | Target Coverage | Priority |
|--------|----------------|----------|
| `routes/*.py` | 80% | High |
| `visualizations/*.py` | 75% | High |
| `utils/*.py` | 85% | High |
| `cache/*.py` | 70% | Medium |
| `config/*.py` | 60% | Low |
| **Overall** | **70%** | **Required** |

### Frontend Coverage Targets

| Component Type | Target Coverage |
|----------------|----------------|
| All components | Render test (100%) |
| Interactive components | Interaction test (100%) |
| Custom hooks | Logic test (100%) |
| Utility functions | Unit test (80%) |

### E2E Coverage Targets

| User Flow | Status |
|-----------|--------|
| Match selection → Visualization | ✅ Required |
| Error handling | ✅ Required |
| Multiple visualizations | ✅ Required |
| Game phases navigation | ✅ Required |

---

## Test Conventions

### Naming Conventions

**Backend:**
- Test files: `test_*.py`
- Test functions: `test_*`
- Test classes: `Test*`

**Frontend:**
- Test files: `*.test.js` or `*.spec.js`
- Test descriptions: Descriptive strings

### Test Structure (AAA Pattern)

```python
def test_function_name():
    # Arrange
    data = create_test_data()
    
    # Act
    result = function_under_test(data)
    
    # Assert
    assert result == expected_value
```

### Mocking Strategy

- **Backend**: Mock external services (S3, Redis)
- **Frontend**: Mock API calls using MSW
- **E2E**: Use real backend (or test backend)

---

## Risk Mitigation

### Potential Challenges

1. **AWS/S3 Dependency**
   - **Solution**: Mock S3 client in tests
   - **Fallback**: Use moto library for S3 mocking

2. **Redis Dependency**
   - **Solution**: Mock Redis or use fake-redis
   - **Fallback**: Use in-memory cache for tests

3. **Plotly Rendering**
   - **Solution**: Mock Plotly.js in frontend tests
   - **Fallback**: Test data structure, not rendering

4. **E2E Test Flakiness**
   - **Solution**: Add retries, wait strategies
   - **Fallback**: Increase timeouts, use page objects

5. **CI/CD Complexity**
   - **Solution**: Start with basic workflow, iterate
   - **Fallback**: Run tests manually initially

---

## Success Metrics

### Quantitative Metrics
- ✅ Backend code coverage ≥ 70%
- ✅ All routes have integration tests
- ✅ All React components have render tests
- ✅ 4+ critical E2E flows covered
- ✅ All tests pass in CI/CD
- ✅ Test execution time < 10 minutes (CI)

### Qualitative Metrics
- ✅ Tests are readable and maintainable
- ✅ Tests catch bugs before production
- ✅ Developers confident to refactor
- ✅ New features include tests
- ✅ Test documentation is complete

---

## Tools & Technologies Summary

| Category | Tool | Purpose |
|----------|------|---------|
| Backend Testing | pytest | Test framework |
| Backend Testing | pytest-asyncio | Async test support |
| Backend Testing | pytest-cov | Coverage reporting |
| Backend Testing | httpx | FastAPI client testing |
| Backend Testing | moto | AWS service mocking |
| Frontend Testing | React Testing Library | Component testing |
| Frontend Testing | MSW | API mocking |
| E2E Testing | Playwright | Browser automation |
| Coverage | Coverage.py | Python coverage |
| Coverage | Jest Coverage | JavaScript coverage |
| CI/CD | GitHub Actions | Automated testing |

---
