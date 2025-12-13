import { useState, useEffect } from "react";

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000/api').replace(/\/+$/, '');

export default function useGamePhases(selectedMatch) {
  const [gamePhases, setGamePhases] = useState([]);
  const [gamePhaseLoading, setGamePhaseLoading] = useState(false);
  const [gamePhaseError, setGamePhaseError] = useState(null);
  const [gamePhaseTeams, setGamePhaseTeams] = useState({ home: "", away: "" });
  const [gamePhaseMetrics, setGamePhaseMetrics] = useState([]);

  useEffect(() => {
    if (!selectedMatch) {
      setGamePhases([]);
      setGamePhaseError(null);
      setGamePhaseTeams({ home: "", away: "" });
      setGamePhaseMetrics([]);
      return;
    }
    setGamePhaseLoading(true);
    setGamePhaseError(null);
    fetch(`${BACKEND_URL}/match/${selectedMatch}/game_phases`)
      .then(res => res.json())
      .then(res => {
        if (res.error) throw new Error(res.error);
        setGamePhases(res.phases || []);
        setGamePhaseTeams({ home: res.home_team || "", away: res.away_team || "" });
        setGamePhaseMetrics(res.phase_metrics || []);
      })
      .catch(e => setGamePhaseError(e.message))
      .finally(() => setGamePhaseLoading(false));
  }, [selectedMatch]);

  return {
    gamePhases,
    gamePhaseLoading,
    gamePhaseError,
    gamePhaseTeams,
    gamePhaseMetrics,
  };
}

