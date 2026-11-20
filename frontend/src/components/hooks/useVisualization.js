import { useState, useCallback } from "react";
import { TEAM_COLORS } from "../../assets/teamColors";
import { BACKEND_URL } from "../../config/api";

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
          // Home team traces - preserve backend Goal styling (black outline)
          ...(homeData.data || []).map((t) => {
            const isGoalTrace = t.name === 'Goal';
            return {
              ...t,
              marker: {
                ...(t.marker || {}),
                colorscale: [ [0, "white"], [1, homeColor] ],
                showscale: false,
                // Keep black outline for goals, otherwise use team color
                line: isGoalTrace 
                  ? { color: 'black', width: 3 }
                  : { color: homeColor, width: 1 }
              },
              name: isGoalTrace ? `${home} Goal` : `${home}`,
            };
          }),
          // Away team traces - preserve backend Goal styling (black outline)
          ...(awayData.data || []).map((t) => {
            const isGoalTrace = t.name === 'Goal';
            return {
              ...t,
              marker: {
                ...(t.marker || {}),
                colorscale: [ [0, "white"], [1, awayColor] ],
                showscale: false,
                // Keep black outline for goals, otherwise use team color
                line: isGoalTrace 
                  ? { color: 'black', width: 3 }
                  : { color: awayColor, width: 1 }
              },
              name: isGoalTrace ? `${away} Goal` : `${away}`,
            };
          }),
        ],
        layout: { 
          ...(homeData.layout || {}),
          title: `Shot Map — ${home} vs ${away}`,
          showlegend: true,
          legend: {
            x: 0.5,
            y: 1.05,
            xanchor: 'center',
            yanchor: 'bottom',
            orientation: 'h',
            bgcolor: 'rgba(255,255,255,0.8)',
            bordercolor: '#ccc',
            borderwidth: 1,
            font: { size: 22, weight: "bold" }
          }
        },
      };
      return result;
    } catch (err) {
      console.error("Both shotmaps fetch failed:", err);
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function loadPassingNetwork(filename, team, minPasses = 1, flip = false, subs = false) {
    if (!filename || !team) return;
    setLoading(true);
    try {
      const url = `${BACKEND_URL}/match/${encodeURIComponent(filename)}/passing_network?team=${encodeURIComponent(team)}&min_passes=${minPasses}&flip=${flip}&subs=${subs}`;
      const data = await _fetchJson(url);
      
      return data;
    } catch (err) {
      console.error("Passing network fetch failed:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // Per-player attack and chance-creation tables for one team
  async function loadPlayerTables(filename, team) {
    if (!filename || !team) return null;
    const url = `${BACKEND_URL}/match/${encodeURIComponent(filename)}/player_tables?team=${encodeURIComponent(team)}`;
    return _fetchJson(url);
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
    loadPlayerTables,
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
