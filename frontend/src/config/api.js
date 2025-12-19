/**
 * API Configuration
 * 
 * Centralized backend URL configuration with build-time and runtime validation.
 * 
 * In production builds, REACT_APP_BACKEND_URL MUST be set or the build will fail.
 * In development, defaults to http://localhost:8000/api if not set.
 */

/**
 * Get the backend URL from environment variables
 * @throws {Error} If REACT_APP_BACKEND_URL is not set in production builds
 * @returns {string} The backend URL with trailing slashes removed
 */
const getBackendUrl = () => {
  const envUrl = process.env.REACT_APP_BACKEND_URL;
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Build-time validation: Fail hard if missing in production
  if (isProduction && !envUrl) {
    throw new Error(
      'REACT_APP_BACKEND_URL environment variable is required for production builds.\n' +
      'Please set REACT_APP_BACKEND_URL before running npm run build.\n' +
      'Example: REACT_APP_BACKEND_URL=https://your-api.com/api npm run build'
    );
  }
  
  // Development fallback
  const url = envUrl || 'http://localhost:8000/api';
  
  // Remove trailing slashes
  return url.replace(/\/+$/, '');
};

// Export the backend URL
export const BACKEND_URL = getBackendUrl();

// Runtime validation (for development/debugging)
if (typeof window !== 'undefined') {
  if (!BACKEND_URL || BACKEND_URL === '/api') {
    console.error(
      '⚠️ Backend URL is not properly configured.\n' +
      'Current value:', BACKEND_URL, '\n' +
      'Set REACT_APP_BACKEND_URL environment variable before building.'
    );
  } else {
    console.log('✅ Backend URL configured:', BACKEND_URL);
  }
}

