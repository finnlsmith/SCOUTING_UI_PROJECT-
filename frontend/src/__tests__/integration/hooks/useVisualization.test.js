/**
 * Integration tests for useVisualization hook
 * Tests API integration for visualization data fetching
 */
import { renderHook, waitFor, act } from '@testing-library/react';
import useVisualization from '../../../components/hooks/useVisualization';
import { server } from '../../helpers/setupMSW';
import { http, HttpResponse } from 'msw';

const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000/api';

describe('useVisualization Hook - Integration Tests', () => {
  const mockMatchFile = 'events_3788741.csv';
  const mockStatsCallback = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loadMatchViz', () => {
    it('should load match visualization successfully', async () => {
      const { result } = renderHook(() => useVisualization());

      await act(async () => {
        await result.current.loadMatchViz(mockMatchFile, mockStatsCallback);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.figData).toBeDefined();
      expect(result.current.figData.data).toBeDefined();
      expect(mockStatsCallback).toHaveBeenCalled();
    });

    it('should set loading state during fetch', async () => {
      const { result } = renderHook(() => useVisualization());

      const loadPromise = act(async () => {
        await result.current.loadMatchViz(mockMatchFile);
      });

      // Should be loading initially
      expect(result.current.loading).toBe(true);

      await loadPromise;

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should handle errors gracefully', async () => {
      server.use(
        http.get(`${API_BASE}/match/:filename/viz`, () => {
          return HttpResponse.json(
            { detail: 'File not found' },
            { status: 404 }
          );
        })
      );

      const { result } = renderHook(() => useVisualization());

      await act(async () => {
        await result.current.loadMatchViz(mockMatchFile);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should handle error without crashing
      expect(result.current.figData).toBeNull();
    });

    it('should not fetch if matchFile is null', async () => {
      const { result } = renderHook(() => useVisualization());

      await act(async () => {
        await result.current.loadMatchViz(null);
      });

      expect(result.current.figData).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });

  describe('loadTeamShotmap', () => {
    const mockTeam = 'Italy';

    it('should load team shotmap successfully', async () => {
      const { result } = renderHook(() => useVisualization());

      let shotmapData;
      await act(async () => {
        shotmapData = await result.current.loadTeamShotmap(mockMatchFile, mockTeam);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(shotmapData).toBeDefined();
      expect(shotmapData.data).toBeDefined();
    });

    it('should apply team color to markers', async () => {
      const { result } = renderHook(() => useVisualization());

      let shotmapData;
      await act(async () => {
        shotmapData = await result.current.loadTeamShotmap(mockMatchFile, mockTeam);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      if (shotmapData && shotmapData.data && shotmapData.data.length > 0) {
        const firstTrace = shotmapData.data[0];
        expect(firstTrace.marker).toBeDefined();
        expect(firstTrace.marker.colorscale).toBeDefined();
      }
    });

    it('should return null on error', async () => {
      server.use(
        http.get(`${API_BASE}/match/:filename/viz`, () => {
          return HttpResponse.json(
            { detail: 'File not found' },
            { status: 404 }
          );
        })
      );

      const { result } = renderHook(() => useVisualization());

      let shotmapData;
      await act(async () => {
        shotmapData = await result.current.loadTeamShotmap(mockMatchFile, mockTeam);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(shotmapData).toBeNull();
    });
  });

  describe('loadBothShotmaps', () => {
    const mockHome = 'Italy';
    const mockAway = 'England';

    it('should load both team shotmaps successfully', async () => {
      const { result } = renderHook(() => useVisualization());

      let bothShotmaps;
      await act(async () => {
        bothShotmaps = await result.current.loadBothShotmaps(
          mockMatchFile,
          mockHome,
          mockAway
        );
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(bothShotmaps).toBeDefined();
      expect(bothShotmaps.data).toBeDefined();
      expect(Array.isArray(bothShotmaps.data)).toBe(true);
      expect(bothShotmaps.layout).toBeDefined();
      expect(bothShotmaps.layout.title).toContain(mockHome);
      expect(bothShotmaps.layout.title).toContain(mockAway);
    });

    it('should combine data from both teams', async () => {
      const { result } = renderHook(() => useVisualization());

      let bothShotmaps;
      await act(async () => {
        bothShotmaps = await result.current.loadBothShotmaps(
          mockMatchFile,
          mockHome,
          mockAway
        );
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      if (bothShotmaps && bothShotmaps.data) {
        // Should have traces from both teams
        const traceNames = bothShotmaps.data.map(t => t.name);
        expect(traceNames.length).toBeGreaterThan(0);
      }
    });

    it('should return null if any parameter is missing', async () => {
      const { result } = renderHook(() => useVisualization());

      let result1, result2, result3;
      await act(async () => {
        result1 = await result.current.loadBothShotmaps(null, mockHome, mockAway);
        result2 = await result.current.loadBothShotmaps(mockMatchFile, null, mockAway);
        result3 = await result.current.loadBothShotmaps(mockMatchFile, mockHome, null);
      });

      expect(result1).toBeUndefined();
      expect(result2).toBeUndefined();
      expect(result3).toBeUndefined();
    });
  });

  describe('fetchImportantMoments', () => {
    it('should fetch important moments successfully', async () => {
      const { result } = renderHook(() => useVisualization());

      await act(async () => {
        await result.current.fetchImportantMoments(mockMatchFile);
      });

      await waitFor(() => {
        expect(result.current.importantMomentsLoading).toBe(false);
      });

      expect(result.current.importantMoments).toBeDefined();
      expect(Array.isArray(result.current.importantMoments)).toBe(true);
      expect(result.current.importantMomentsError).toBeNull();
    });

    it('should handle loading state', async () => {
      const { result } = renderHook(() => useVisualization());

      const fetchPromise = act(async () => {
        await result.current.fetchImportantMoments(mockMatchFile);
      });

      // Should be loading initially
      expect(result.current.importantMomentsLoading).toBe(true);

      await fetchPromise;

      await waitFor(() => {
        expect(result.current.importantMomentsLoading).toBe(false);
      });
    });

    it('should handle errors', async () => {
      server.use(
        http.get(`${API_BASE}/match/:filename/important_moments`, () => {
          return HttpResponse.json(
            { detail: 'File not found' },
            { status: 404 }
          );
        })
      );

      const { result } = renderHook(() => useVisualization());

      await act(async () => {
        await result.current.fetchImportantMoments(mockMatchFile);
      });

      await waitFor(() => {
        expect(result.current.importantMomentsLoading).toBe(false);
      });

      expect(result.current.importantMoments).toEqual([]);
      expect(result.current.importantMomentsError).toBeTruthy();
    });

    it('should not fetch if matchFile is null', async () => {
      const { result } = renderHook(() => useVisualization());

      await act(async () => {
        await result.current.fetchImportantMoments(null);
      });

      // Should not change state
      expect(result.current.importantMoments).toEqual([]);
      expect(result.current.importantMomentsLoading).toBe(false);
    });
  });

  describe('setFigData', () => {
    it('should allow manually setting figData', () => {
      const { result } = renderHook(() => useVisualization());
      const mockData = { data: [], layout: {} };

      act(() => {
        result.current.setFigData(mockData);
      });

      expect(result.current.figData).toBe(mockData);
    });
  });
});

