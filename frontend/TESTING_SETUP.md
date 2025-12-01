# Frontend Testing Setup - Quick Start

## ✅ What Has Been Set Up

1. **Test Directory Structure** (`src/__tests__/`)
2. **Test Utilities** (`helpers/testUtils.jsx`)
3. **MSW Setup** (`helpers/setupMSW.js` and `mockHandlers.js`)
4. **Component Tests** (ErrorBanner, MatchSelector, Scoreboard)
5. **Global Test Setup** (`setup.js`)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd frontend
npm install
```

This will install:
- React Testing Library (already installed)
- MSW (Mock Service Worker) for API mocking
- All other testing dependencies

### 2. Run Tests

```bash
# Run all tests
npm test

# Run in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage
```

### 3. Write Your First Test

Create a test file in `src/__tests__/components/`:

```javascript
import { render, screen } from '@testing-library/react';
import MyComponent from '../../components/MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## 📁 Test Structure

```
src/__tests__/
├── components/              # Component tests
│   ├── ErrorBanner.test.js
│   ├── MatchSelector.test.js
│   └── Scoreboard.test.js
├── helpers/                 # Test utilities
│   ├── testUtils.jsx       # Custom render functions
│   ├── mockHandlers.js     # API mock handlers
│   └── setupMSW.js         # MSW configuration
├── setup.js                 # Global test setup
└── README.md               # Detailed testing guide
```

## 🧪 Current Test Coverage

### Component Tests Created:

1. **ErrorBanner.test.js** (7 tests)
   - Renders nothing when no error
   - Displays error message
   - Close button functionality
   - Handles long error messages

2. **MatchSelector.test.js** (10 tests)
   - Renders select element
   - Filters Frames 360 matches
   - Cleans match labels
   - Handles user selection
   - Loading state

3. **Scoreboard.test.js** (16 tests)
   - Renders team names and scores
   - Displays all statistics
   - Handles missing data
   - Conditional rendering

**Total: 33 component tests**

## 🛠️ Test Utilities

### Custom Render Functions

```javascript
import { renderWithProviders } from '../helpers/testUtils';

// Renders with Router + ThemeProvider
renderWithProviders(<Component />, {
  route: '/matches',
  theme: 'dark'
});
```

### Mock Data

```javascript
import { mockMatches, mockMatchStats } from '../helpers/testUtils';
```

### API Mocking

MSW automatically mocks all API calls. Handlers are defined in `mockHandlers.js`.

## 📝 Next Steps

1. **Run the tests** to verify setup works
2. **Add more component tests** following existing patterns
3. **Test custom hooks** in `components/hooks/`
4. **Add integration tests** for full user flows
5. **Aim for 70% coverage** (currently at ~0%, but foundation is ready)

## 🔧 Configuration

### Jest Configuration

Jest is configured via `react-scripts`. Configuration is in:
- `package.json` - Scripts and dependencies
- `src/setupTests.js` - Global test setup

### MSW Configuration

- `src/__tests__/helpers/mockHandlers.js` - API mock handlers
- `src/__tests__/helpers/setupMSW.js` - MSW server setup

## 📚 Documentation

See `src/__tests__/README.md` for detailed testing documentation including:
- Writing tests
- Best practices
- Troubleshooting
- Examples

## 🎯 Testing Goals

- **Minimum**: 70% overall coverage
- **Component Tests**: 80% coverage
- **Hook Tests**: 75% coverage
- **Integration Tests**: Key user flows covered

The foundation is ready! Start writing tests for your components. 🚀

