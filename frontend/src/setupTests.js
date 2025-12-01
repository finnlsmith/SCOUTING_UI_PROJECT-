// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Import test setup utilities
import './__tests__/setup';

// Setup MSW for API mocking in tests (optional - will skip if MSW not available)
try {
  require('./__tests__/helpers/setupMSW');
} catch (e) {
  // MSW setup failed - tests can still run without API mocking
  console.warn('MSW setup skipped:', e.message);
}
