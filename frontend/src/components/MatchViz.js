import React, { useState, useEffect } from "react";
import useMatchData from "./useMatchData";
import useUpload from "./useUpload";
import useVisualization from "./useVisualization";

import ErrorBanner from "./ErrorBanner";
import FileUpload from "./FileUpload";
import MatchSelector from "./MatchSelector";
import Scoreboard from "./Scoreboard";
import ShotMapButtons from "./ShotMapButtons";
import ShotMapPlot from "./ShotMapPlot";

export default function MatchViz() {
  const { matches, loading: matchesLoading, error: matchesError, setError: setMatchesError } = useMatchData();
  const { file, setFile, upload, uploading, success, error: uploadError, setError: setUploadError } = useUpload();
  const { figData, loading: plotLoading, loadMatchViz, loadTeamShotmap, loadBothShotmaps } = useVisualization();

  const [selectedMatch, setSelectedMatch] = useState("");
  const [flipSides, setFlipSides] = useState(false);
  const [stats, setStats] = useState({});
  const [globalError, setGlobalError] = useState("");

  useEffect(() => {
    setGlobalError(matchesError || uploadError);
  }, [matchesError, uploadError]);

  function handleClearError() {
    setGlobalError("");
    setMatchesError("");
    setUploadError("");
  }

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <ErrorBanner error={globalError} onClose={handleClearError} />

      <h2>Select or Upload a Match</h2>

      <FileUpload
        onFileChange={(e) => setFile(e.target.files[0])}
        onUpload={async () => {
          const data = await upload();
          if (data) setStats(data);
        }}
        uploading={uploading}
        uploadSuccess={success}
      />

      <MatchSelector
        matches={matches}
        selectedMatch={selectedMatch}
        onChange={(v) => {
          setSelectedMatch(v);
          loadMatchViz(v, setStats);
        }}
        flipSides={flipSides}
        onFlipChange={setFlipSides}
        onReset={() => {
          setSelectedMatch("");
          setStats({});
        }}
        matchesLoading={matchesLoading}
      />

      <Scoreboard
        stage={stats.competition_stage}
        home={stats.home_team}
        away={stats.away_team}
        score={
          stats.home_score !== undefined
            ? `${stats.home_score} - ${stats.away_score}`
            : "-"
        }
        shots={
          stats.home_shots !== undefined
            ? `${stats.home_shots} - ${stats.away_shots}`
            : "-"
        }
        shotsOnTarget={
          stats.home_shots_on_target !== undefined
            ? `${stats.home_shots_on_target} - ${stats.away_shots_on_target}`
            : "-"
        }
        xg={
          stats.home_xg_sum !== undefined
            ? `${Number(stats.home_xg_sum || 0).toFixed(2)} - ${Number(
                stats.away_xg_sum || 0
              ).toFixed(2)}`
            : "-"
        }
      />

      <ShotMapButtons
        home={stats.home_team}
        away={stats.away_team}
        onHome={() => loadTeamShotmap(selectedMatch, stats.home_team)}
        onAway={() => loadTeamShotmap(selectedMatch, stats.away_team)}
        onBoth={() => loadBothShotmaps(selectedMatch, stats.home_team, stats.away_team)}
      />

      <ShotMapPlot displayFig={figData} flipSides={flipSides} plotLoading={plotLoading} />
    </div>
  );
}
