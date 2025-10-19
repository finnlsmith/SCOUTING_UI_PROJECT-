import { useState } from "react";
import {TEAM_COLORS} from "../constants/teamColors";

const BACKEND_URL = "https://columbia-msds-f25-soccer.onrender.com";

export default function useVisualization() {
  const [figData, setFigData] = useState(null);
  const [loading, setLoading] = useState(false);

  async function loadMatchViz(matchFile, setStats) {
    if (!matchFile) return;
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/match/${matchFile}/viz`);
      const data = await res.json();
      setFigData(data);
      setStats(data);
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
      const res = await fetch(
        `${BACKEND_URL}/api/match/${matchFile}/viz?team=${encodeURIComponent(team)}`
      );
      const data = await res.json();
      const color = TEAM_COLORS[team] || "#1f77b4";
      setFigData({
        ...data,
        data: data.data.map((t) => ({
          ...t,
          marker: { ...t.marker, colorscale: [[0, "white"], [1, color]] },
        })),
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadBothShotmaps(matchFile, home, away) {
    if (!matchFile || !home || !away) return;
    setLoading(true);
    try {
      const [homeRes, awayRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/match/${matchFile}/viz?team=${home}`),
        fetch(`${BACKEND_URL}/api/match/${matchFile}/viz?team=${away}`),
      ]);
      const [homeData, awayData] = await Promise.all([homeRes.json(), awayRes.json()]);
      const homeColor = TEAM_COLORS[home] || "#1f77b4";
      const awayColor = TEAM_COLORS[away] || "#ff7f0e";
      setFigData({
        data: [
          ...homeData.data.map((t) => ({
            ...t,
            marker: { ...t.marker, colorscale: [[0, "white"], [1, homeColor]] },
            name: `${home} – ${t.name}`,
          })),
          ...awayData.data.map((t) => ({
            ...t,
            marker: { ...t.marker, colorscale: [[0, "white"], [1, awayColor]] },
            name: `${away} – ${t.name}`,
          })),
        ],
        layout: { title: `Shot Map — ${home} vs ${away}` },
      });
    } finally {
      setLoading(false);
    }
  }

  return { figData, setFigData, loading, loadMatchViz, loadTeamShotmap, loadBothShotmaps };
}
