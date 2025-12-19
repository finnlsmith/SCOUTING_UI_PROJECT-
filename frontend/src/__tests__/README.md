# Frontend Testing Guide

This directory contains all frontend tests using React Testing Library and Jest.

## 📁 Directory Structure

```
src/__tests__/
├── components/          # Component tests
│   ├── ErrorBanner.test.js
│   ├── MatchSelector.test.js
│   └── Scoreboard.test.js
├── helpers/             # Test utilities and mocks
│   ├── testUtils.jsx    # Custom render functions and utilities
│   ├── mockHandlers.js  # MSW API mock handlers
│   └── setupMSW.js      # MSW server setup
├── setup.js             # Global test setup
└── README.md            # This file
```

## 🚀 Getting Started

### Install Dependencies

```bash
cd frontend
npm install
```

MSW (Mock Service Worker) is included as a dev dependency for API mocking.

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run a specific test file
npm test -- ErrorBanner.test.js
```

## 🧪 Writing Tests

### Basic Component Test

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

### Using Test Utilities

Import custom utilities for providers:

```javascript
import { renderWithProviders } from '../helpers/testUtils';
import MyComponent from '../../components/MyComponent';

describe('MyComponent', () => {
  it('renders with router and theme', () => {
    renderWithProviders(<MyComponent />, { 
      route: '/matches',
      theme: 'dark' 
    });
    // Your test assertions
  });
});
```

### Testing with API Calls

MSW automatically mocks API calls. Use it in your tests:

```javascript
import { render, screen, waitFor } from '@testing-library/react';
import { server } from '../helpers/setupMSW';
import { http, HttpResponse } from 'msw';
import MyComponent from '../../components/MyComponent';

describe('MyComponent with API', () => {
  it('fetches and displays data', async () => {
    render(<MyComponent />);
    
    // Wait for API call to complete
    await waitFor(() => {
      expect(screen.getByText('Data loaded')).toBeInTheDocument();
    });
  });

  it('handles API errors', async () => {
    // Override default handler for this test
    server.use(
      http.get('/api/matches', () => {
        return HttpResponse.json(
          { error: 'Not found' },
          { status: 404 }
        );
      })
    );

    render(<MyComponent />);
    await waitFor(() => {
      expect(screen.getByText('Error loading data')).toBeInTheDocument();
    });
  });
});
```

## 🛠️ Test Utilities

### `renderWithProviders(ui, options)`

Renders component with Router and ThemeProvider:

```javascript
renderWithProviders(<Component />, {
  route: '/matches',      // Initial route
  theme: 'dark',          // Theme ('light' or 'dark')
  ...renderOptions         // Other RTL options
});
```

### `renderWithRouter(ui, options)`

Renders component with Router only:

```javascript
renderWithRouter(<Component />, { route: '/matches' });
```

### Mock Data

Pre-defined mock data available:

```javascript
import { mockMatches, mockMatchStats } from '../helpers/testUtils';
```

## 🎯 Testing Best Practices

### 1. Test User Behavior, Not Implementation

✅ **Good:**
```javascript
it('calls onChange when match is selected', async () => {
  const handleChange = jest.fn();
  render(<MatchSelector onChange={handleChange} />);
  
  const select = screen.getByRole('combobox');
  await userEvent.selectOptions(select, 'events_1.csv');
  
  expect(handleChange).toHaveBeenCalledWith('events_1.csv');
});
```

❌ **Bad:**
```javascript
it('calls onChange prop', () => {
  const handleChange = jest.fn();
  const component = render(<MatchSelector onChange={handleChange} />);
  // Testing internal implementation
  component.instance().handleChange('events_1.csv');
  expect(handleChange).toHaveBeenCalled();
});
```

### 2. Use Accessible Queries

Prefer queries that reflect how users interact:

```javascript
// ✅ Good - accessible queries
screen.getByRole('button', { name: 'Submit' });
screen.getByLabelText('Email');
screen.getByText('Welcome');

// ❌ Avoid - implementation details
container.querySelector('.submit-button');
screen.getByTestId('email-input');
```

### 3. Test Edge Cases

```javascript
it('handles empty matches array', () => {
  render(<MatchSelector matches={[]} />);
  expect(screen.getByText('-- Choose a match --')).toBeInTheDocument();
});

it('renders nothing when error is null', () => {
  const { container } = render(<ErrorBanner error={null} />);
  expect(container.firstChild).toBeNull();
});
```

### 4. Clean Up After Tests

MSW automatically resets handlers between tests. For other cleanup:

```javascript
afterEach(() => {
  // Clean up if needed
  jest.clearAllMocks();
});
```

## 📊 Coverage Goals

- **Minimum**: 70% overall coverage
- **Targets**:
  - Components: 80%
  - Hooks: 75%
  - Utilities: 85%

## 🔧 Troubleshooting

### Tests fail with "Cannot find module"

Make sure you're using relative paths correctly:
```javascript
// ✅ Correct
import Component from '../../components/Component';

// ❌ Wrong
import Component from 'components/Component';
```

### MSW not working

1. Ensure MSW is installed: `npm install --save-dev msw`
2. Check that `setupMSW.js` is imported in `setupTests.js`
3. Verify handlers are correctly defined in `mockHandlers.js`

### Async operations not completing

Use `waitFor` or `findBy` queries:

```javascript
// ✅ Good
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});

// Or use findBy (which automatically waits)
const element = await screen.findByText('Loaded');
```

### Theme/Router context errors

Use `renderWithProviders` instead of `render`:

```javascript
// ✅ Good
renderWithProviders(<Component />);

// ❌ May fail if component needs context
render(<Component />);
```

## 📚 Resources

- [React Testing Library Docs](https://testing-library.com/react)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [MSW Documentation](https://mswjs.io/docs/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## 🎓 Example Test Files

See existing test files for examples:
- `components/ErrorBanner.test.js` - Simple component testing
- `components/MatchSelector.test.js` - User interaction testing
- `components/Scoreboard.test.js` - Props and conditional rendering

