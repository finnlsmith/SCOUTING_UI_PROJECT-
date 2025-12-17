# Frontend Integration/API Tests

## Overview

Integration tests for frontend hooks and components that interact with the backend API. These tests use MSW (Mock Service Worker) to mock API responses.

## Test Files

### Hook Integration Tests

1. **`hooks/useMatchData.test.js`** - Tests for `useMatchData` hook
   - Fetches matches list from `/api/matches`
   - Tests loading states, error handling, and data transformation

2. **`hooks/useUpload.test.js`** - Tests for `useUpload` hook
   - Tests CSV file upload to `/api/upload`
   - Tests upload states, error handling, and success scenarios

3. **`hooks/useVisualization.test.js`** - Tests for `useVisualization` hook
   - Tests visualization data fetching:
     - `loadMatchViz` - Load match visualization
     - `loadTeamShotmap` - Load team-specific shot map
     - `loadBothShotmaps` - Load combined shot maps
     - `fetchImportantMoments` - Fetch important match moments

## Setup

These tests require MSW (Mock Service Worker) to be installed:

```bash
npm install --save-dev msw
```

MSW is configured in:
- `src/__tests__/helpers/setupMSW.js` - MSW server setup
- `src/__tests__/helpers/mockHandlers.js` - API mock handlers

## Running Tests

```bash
# Run all integration tests
npm test -- --testPathPattern="integration"

# Run specific hook tests
npm test -- --testPathPattern="integration/hooks/useMatchData"
npm test -- --testPathPattern="integration/hooks/useUpload"
npm test -- --testPathPattern="integration/hooks/useVisualization"
```

## Known Issues

### MSW in Jest Environment

MSW v2.x requires ES module support in Jest. If you encounter errors like "Unexpected token 'export'", you may need to:

1. Update Jest configuration to transform MSW modules
2. Or use MSW v1.x (legacy) which has better Node/Jest support

See: https://mswjs.io/docs/migrations/1.x-to-2.x/migrate-to-v2

## Status

- ✅ Test files created
- ⚠️ MSW configuration needs Jest ES module support
- ⚠️ Tests may need adjustment based on Jest/React Scripts version

