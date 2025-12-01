/**
 * Setup Mock Service Worker for API mocking in tests
 * 
 * Note: MSW setup is optional. If MSW is not available, tests will still run.
 */

// Polyfill for TextEncoder/TextDecoder (required by MSW in Jest)
if (typeof TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

let server = null;

try {
  const { setupServer } = require('msw/node');
  const { handlers } = require('./mockHandlers');

  // Create MSW server with our handlers
  server = setupServer(...handlers);

  // Setup server before all tests
  beforeAll(() => {
    if (server) {
      server.listen({ onUnhandledRequest: 'warn' });
    }
  });

  // Reset handlers after each test (useful for test isolation)
  afterEach(() => {
    if (server) {
      server.resetHandlers();
    }
  });

  // Clean up after all tests
  afterAll(() => {
    if (server) {
      server.close();
    }
  });
} catch (error) {
  // MSW not available or setup failed - tests can still run without API mocking
  // Silently skip MSW setup
}

module.exports = { server };

