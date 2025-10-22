import { useState } from "react";
import { TEAM_COLORS } from "../constants/teamColors";

const BACKEND_URL = "https://columbia-msds-f25-soccer.onrender.com";
// const BACKEND_URL = "http://localhost:8000";

async function _fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Helper to flip x (and optionally y) for away team traces
function flipTraceX(trace, pitchLength = 120) {
  const newTrace = { ...trace };
  if (Array.isArray(newTrace.x)) {
    newTrace.x = newTrace.x.map(v => (typeof v === "number" ? pitchLength - v : v));
  }
  return newTrace;
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
      const url = `${BACKEND_URL}/api/match/${encodeURIComponent(matchFile)}/viz`;
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
      const url = `${BACKEND_URL}/api/match/${encodeURIComponent(
        matchFile
      )}/viz?team=${encodeURIComponent(team)}`;
      const data = await _fetchJson(url);

      const color = TEAM_COLORS[team] || "#1f77b4";
      setFigData({
        ...data,
        data: (data.data || []).map((t) => ({
          ...t,
          marker: {
            ...(t.marker || {}),
            colorscale: [
              [0, "white"],
              [1, color],
            ],
          },
        })),
      });
    } catch (err) {
      console.error("Team shotmap fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadBothShotmaps(matchFile, home, away) {
    if (!matchFile || !home || !away) return;
    setLoading(true);
    try {
      const [homeUrl, awayUrl] = [
        `${BACKEND_URL}/api/match/${encodeURIComponent(
          matchFile
        )}/viz?team=${encodeURIComponent(home)}`,
        `${BACKEND_URL}/api/match/${encodeURIComponent(
          matchFile
        )}/viz?team=${encodeURIComponent(away)}`,
      ];
      const [homeData, awayData] = await Promise.all([
        _fetchJson(homeUrl),
        _fetchJson(awayUrl),
      ]);

      console.log('Home Team Shot Data:', homeData.data);
      console.log('Away Team Shot Data:', awayData.data);

      const homeColor = TEAM_COLORS[home] || "#1f77b4";
      const awayColor = TEAM_COLORS[away] || "#ff7f0e";

      setFigData({
        data: [
          ...(homeData.data || []).map((t) => ({
            ...t,
            marker: {
              ...(t.marker || {}),
              colorscale: [
                [0, "white"],
                [1, homeColor],
              ],
              showscale: false, // Hide colorbar
            },
            name: `${home} – ${t.name ?? "Shot"}`,
          })),
          ...(awayData.data || []).map((t) => ({
            ...flipTraceX(t, 120), // Flip X for away team. 120 = pitch length
            marker: {
              ...(t.marker || {}),
              colorscale: [
                [0, "white"],
                [1, awayColor],
              ],
              showscale: false, // Hide colorbar
            },
            name: `${away} – ${t.name ?? "Shot"}`,
          })),
        ],
        layout: {
          ...(homeData.layout || {}),
          title: `Shot Map — ${home} vs ${away}`,
        },
      });
    } catch (err) {
      console.error("Both shotmaps fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }

  // ✅ Use BACKEND_URL here (API was undefined)
  async function loadPassingNetwork(filename, team, minPasses = 1, flip = false) {
    if (!filename || !team) return;
    setLoading(true);
    try {
      const url = `${BACKEND_URL}/api/match/${encodeURIComponent(
        filename
      )}/passing_network?team=${encodeURIComponent(
        team
      )}&min_passes=${minPasses}&flip=${flip}`;
      const data = await _fetchJson(url);
      setFigData(data);
      return data;
    } catch (err) {
      console.error("Passing network fetch failed:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function fetchImportantMoments(matchFile) {
    if (!matchFile) return;
    setImportantMomentsLoading(true);
    setImportantMomentsError(null);
    try {
      const url = `${BACKEND_URL}/api/match/${encodeURIComponent(matchFile)}/important_moments`;
      const data = await _fetchJson(url);
      setImportantMoments(data);
    } catch (err) {
      setImportantMoments([]);
      setImportantMomentsError(err?.message || 'Failed to load important moments');
      console.error("Important moments fetch failed:", err);
    } finally {
      setImportantMomentsLoading(false);
    }
  }

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
