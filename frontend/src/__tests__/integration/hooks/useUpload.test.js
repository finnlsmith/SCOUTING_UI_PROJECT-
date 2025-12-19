/**
 * Integration tests for useUpload hook
 * Tests API integration for file upload functionality
 */
import { renderHook, waitFor, act } from '@testing-library/react';
import useUpload from '../../../components/hooks/useUpload';
import { server } from '../../helpers/setupMSW';
import { http, HttpResponse } from 'msw';

const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000/api';

describe('useUpload Hook - Integration Tests', () => {
  let mockFile;

  beforeEach(() => {
    // Create a mock CSV file
    mockFile = new File(['x,y\n1,2\n3,4'], 'test.csv', { type: 'text/csv' });
    jest.clearAllMocks();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useUpload());

    expect(result.current.file).toBe(null);
    expect(result.current.uploading).toBe(false);
    expect(result.current.success).toBe(false);
    expect(result.current.error).toBe('');
    expect(typeof result.current.upload).toBe('function');
    expect(typeof result.current.setFile).toBe('function');
    expect(typeof result.current.setError).toBe('function');
  });

  it('should allow setting a file', () => {
    const { result } = renderHook(() => useUpload());

    act(() => {
      result.current.setFile(mockFile);
    });

    expect(result.current.file).toBe(mockFile);
  });

  it('should upload file successfully', async () => {
    const { result } = renderHook(() => useUpload());

    act(() => {
      result.current.setFile(mockFile);
    });

    let uploadResult;
    await act(async () => {
      uploadResult = await result.current.upload();
    });

    await waitFor(() => {
      expect(result.current.uploading).toBe(false);
    });

    expect(result.current.success).toBe(true);
    expect(result.current.error).toBe('');
    expect(uploadResult).toBeDefined();
    expect(uploadResult.data).toBeDefined();
  });

  it('should handle upload error', async () => {
    // Override handler to return error
    server.use(
      http.post(`${API_BASE}/upload`, () => {
        return HttpResponse.json(
          { error: 'Upload failed' },
          { status: 500 }
        );
      })
    );

    const { result } = renderHook(() => useUpload());

    act(() => {
      result.current.setFile(mockFile);
    });

    await act(async () => {
      await result.current.upload();
    });

    await waitFor(() => {
      expect(result.current.uploading).toBe(false);
    });

    expect(result.current.success).toBe(false);
    expect(result.current.error).toBeTruthy();
    expect(result.current.error).toContain('Upload failed');
  });

  it('should error when uploading without a file', async () => {
    const { result } = renderHook(() => useUpload());

    await act(async () => {
      await result.current.upload();
    });

    expect(result.current.error).toBe('Please choose a CSV file first!');
    expect(result.current.uploading).toBe(false);
    expect(result.current.success).toBe(false);
  });

  it('should handle network errors', async () => {
    server.use(
      http.post(`${API_BASE}/upload`, () => {
        return HttpResponse.error();
      })
    );

    const { result } = renderHook(() => useUpload());

    act(() => {
      result.current.setFile(mockFile);
    });

    await act(async () => {
      await result.current.upload();
    });

    await waitFor(() => {
      expect(result.current.uploading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.error).toContain('Upload failed');
    expect(result.current.success).toBe(false);
  });

  it('should reset error state between uploads', async () => {
    // First upload with error
    server.use(
      http.post(`${API_BASE}/upload`, () => {
        return HttpResponse.json({ error: 'First error' }, { status: 500 });
      })
    );

    const { result } = renderHook(() => useUpload());

    act(() => {
      result.current.setFile(mockFile);
    });

    await act(async () => {
      await result.current.upload();
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    // Reset handler for success
    server.use(
      http.post(`${API_BASE}/upload`, () => {
        return HttpResponse.json({
          data: [{ type: 'scatter', x: [1], y: [2] }],
          layout: { title: 'Test' }
        });
      })
    );

    // Upload again should reset error
    await act(async () => {
      await result.current.upload();
    });

    await waitFor(() => {
      expect(result.current.uploading).toBe(false);
    });

    // Error should be cleared on new upload attempt
    expect(result.current.error).toBe('');
  });

  it('should allow manually setting error', () => {
    const { result } = renderHook(() => useUpload());

    act(() => {
      result.current.setError('Manual error');
    });

    expect(result.current.error).toBe('Manual error');
  });
});

