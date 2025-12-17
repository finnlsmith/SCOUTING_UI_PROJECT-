/**
 * Integration tests for useMatchData hook
 * Tests API integration for fetching match data
 */
import { renderHook, waitFor } from '@testing-library/react';
import useMatchData from '../../../components/hooks/useMatchData';
import { server } from '../../helpers/setupMSW';
import { http, HttpResponse } from 'msw';

const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000/api';

describe('useMatchData Hook - Integration Tests', () => {
  beforeEach(() => {
    // Reset any previous state
    jest.clearAllMocks();
  });

  it('should fetch matches successfully on mount', async () => {
    const { result } = renderHook(() => useMatchData());

    // Initially loading should be true
    expect(result.current.loading).toBe(true);
    expect(result.current.matches).toEqual([]);
    expect(result.current.error).toBe('');

    // Wait for fetch to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should have matches
    expect(result.current.matches.length).toBeGreaterThan(0);
    expect(result.current.error).toBe('');
    expect(result.current.matches[0]).toHaveProperty('file');
    expect(result.current.matches[0]).toHaveProperty('label');
    expect(result.current.matches[0]).toHaveProperty('id');
    expect(result.current.matches[0]).toHaveProperty('name');
  });

  it('should transform match data correctly', async () => {
    const { result } = renderHook(() => useMatchData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Check data transformation
    const firstMatch = result.current.matches[0];
    expect(firstMatch.name).toBe(firstMatch.file.replace('.csv', ''));
    expect(firstMatch.id).toBeDefined();
    expect(typeof firstMatch.id).toBe('number');
  });

  it('should handle API errors gracefully', async () => {
    // Override handler for this test
    server.use(
      http.get(`${API_BASE}/matches`, () => {
        return HttpResponse.json(
          { detail: 'Internal server error' },
          { status: 500 }
        );
      })
    );

    const { result } = renderHook(() => useMatchData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.error).toContain('Failed to load matches');
    expect(result.current.matches).toEqual([]);
  });

  it('should handle network errors', async () => {
    // Simulate network failure
    server.use(
      http.get(`${API_BASE}/matches`, () => {
        return HttpResponse.error();
      })
    );

    const { result } = renderHook(() => useMatchData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.matches).toEqual([]);
  });

  it('should handle 404 errors', async () => {
    server.use(
      http.get(`${API_BASE}/matches`, () => {
        return HttpResponse.json(
          { detail: 'Not found' },
          { status: 404 }
        );
      })
    );

    const { result } = renderHook(() => useMatchData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.error).toContain('HTTP 404');
  });

  it('should allow setting error state manually', async () => {
    const { result } = renderHook(() => useMatchData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Manually set error
    result.current.setError('Custom error message');
    expect(result.current.error).toBe('Custom error message');
  });
});

