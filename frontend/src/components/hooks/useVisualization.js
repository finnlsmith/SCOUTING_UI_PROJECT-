import { useState, useCallback } from "react";
import { TEAM_COLORS } from "../../assets/teamColors";

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || "http://localhost:8000/api").replace(/\/+$/, "");

async function _fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function useVisualization() {
  const [figData, setFigData] = useState(null);
  const [loading, setLoading] = useState(false);
  // Important moments state
  const [importantMoments, setImportantMoments] = useState([]);
  const [importantMomentsLoading, setImportantMomentsLoading] = useState(false);
  const [importantMomentsError, setImportantMomentsError] = useState(null);

  async function loadMatchViz(matchFile, setStats) {
    if (!matchFile) return;
    setLoading(true);
    try {
      const url = `${BACKEND_URL}/match/${encodeURIComponent(matchFile)}/viz`;
      const data = await _fetchJson(url);
      setFigData(data);
      setStats?.(data);
    } catch (err) {
      console.error("Match viz fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadTeamShotmap(matchFile, team) {
    if (!matchFile || !team) return;
    setLoading(true);
    try {
      const url = `${BACKEND_URL}/match/${encodeURIComponent(matchFile)}/viz?team=${encodeURIComponent(team)}`;
      const data = await _fetchJson(url);
      const color = TEAM_COLORS[team] || "#1f77b4";
      const result = {
        ...data,
        data: (data.data || []).map((t) => ({
          ...t,
          marker: {
            ...(t.marker || {}),
            colorscale: [ [0, "white"], [1, color] ],
          },
        })),
      };
      return result;
    } catch (err) {
      console.error("Team shotmap fetch failed:", err);
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function loadBothShotmaps(matchFile, home, away) {
    if (!matchFile || !home || !away) return;
    setLoading(true);
    try {
      const [homeUrl, awayUrl] = [
        `${BACKEND_URL}/match/${encodeURIComponent(matchFile)}/viz?team=${encodeURIComponent(home)}`,
        `${BACKEND_URL}/match/${encodeURIComponent(matchFile)}/viz?team=${encodeURIComponent(away)}`,
      ];
      const [homeData, awayData] = await Promise.all([
        _fetchJson(homeUrl),
        _fetchJson(awayUrl),
      ]);
      const homeColor = TEAM_COLORS[home] || "#1f77b4";
      const awayColor = TEAM_COLORS[away] || "#ff7f0e";
      const result = {
        data: [
          // Home team - backend doesn't flip, use as-is
          ...(homeData.data || []).map((t) => ({
            ...t,
            marker: {
              ...(t.marker || {}),
              colorscale: [ [0, "white"], [1, homeColor] ], showscale: false,
            },
            name: `${home} – ${t.name ?? "Shot"}`,
          })),
          // Away team - backend ALREADY flipped both X and Y, use as-is (NO additional flip!)
          ...(awayData.data || []).map((t) => ({
            ...t,
            marker: {
              ...(t.marker || {}),
              colorscale: [ [0, "white"], [1, awayColor] ], showscale: false,
            },
            name: `${away} – ${t.name ?? "Shot"}`,
          })),
        ],
        layout: { ...(homeData.layout || {}), title: `Shot Map — ${home} vs ${away}` },
      };
      return result;
    } catch (err) {
      console.error("Both shotmaps fetch failed:", err);
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function loadPassingNetwork(filename, team, minPasses = 1, flip = false) {
    if (!filename || !team) return;
    setLoading(true);
    try {
      const url = `${BACKEND_URL}/match/${encodeURIComponent(filename)}/passing_network?team=${encodeURIComponent(team)}&min_passes=${minPasses}&flip=${flip}`;
      const data = await _fetchJson(url);
      
      // Scale marker sizes to be more proportional
      if (data && data.data) {
        data.data = data.data.map(trace => {
          if (trace.marker && trace.marker.size) {
            // If size is an array, scale each value
            if (Array.isArray(trace.marker.size)) {
              const sizes = trace.marker.size;
              const minSize = Math.min(...sizes);
              const maxSize = Math.max(...sizes);
              const range = maxSize - minSize;
              
              // Apply power scaling to make differences more pronounced
              const scaledSizes = sizes.map(s => {
                if (range === 0) return s;
                const normalized = (s - minSize) / range;
                const scaled = Math.pow(normalized, 0.5); // Power of 0.5 creates more dramatic differences
                return minSize + (scaled * range * 2.5); // Multiply by 2.5 for larger overall sizes
              });
              
              return {
                ...trace,
                marker: {
                  ...trace.marker,
                  size: scaledSizes
                }
              };
            }
          }
          return trace;
        });
      }
      
      return data;
    } catch (err) {
      console.error("Passing network fetch failed:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  const fetchImportantMoments = useCallback(async (matchFile) => {
    if (!matchFile) return;
    setImportantMomentsLoading(true);
    setImportantMomentsError(null);
    try {
      const url = `${BACKEND_URL}/match/${encodeURIComponent(matchFile)}/important_moments`;
      const data = await _fetchJson(url);
      setImportantMoments(data);
    } catch (err) {
      setImportantMoments([]);
      setImportantMomentsError(err?.message || 'Failed to load important moments');
      console.error("Important moments fetch failed:", err);
    } finally {
      setImportantMomentsLoading(false);
    }
  }, []);

  return {
    figData,
    setFigData,
    loading,
    loadMatchViz,
    loadTeamShotmap,
    loadBothShotmaps,
    loadPassingNetwork,
    // Important moments
    importantMoments,
    importantMomentsLoading,
    importantMomentsError,
    fetchImportantMoments
  };
}
