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
import PassingNetworkButtons from "./PassingNetworkButtons";

export default function MatchViz() {
  const { matches, loading: matchesLoading, error: matchesError, setError: setMatchesError } = useMatchData();
  const { setFile, upload, uploading, success, error: uploadError, setError: setUploadError } = useUpload(); //file, 
  const {
    figData,
    loading: plotLoading,
    loadMatchViz,
    loadTeamShotmap,
    loadBothShotmaps,
    loadPassingNetwork,
    error: vizError,
    setError: setVizError,
  } = useVisualization();

  const [selectedMatch, setSelectedMatch] = useState("");
  const [flipSides, setFlipSides] = useState(false);
  const [stats, setStats] = useState({});
  const [globalError, setGlobalError] = useState("");

  useEffect(() => {
    setGlobalError(matchesError || uploadError || vizError || "");
  }, [matchesError, uploadError, vizError]);

  function handleClearError() {
    setGlobalError("");
    setMatchesError("");
    setUploadError("");
    setVizError && setVizError("");
  }

  // ====== FALLBACK TEAM NAME LOGIC ======
  // Get the selected match label (e.g. "2021-06-28 - France vs Switzerland – Events")
  const selectedLabel = matches.find(m => m.file === selectedMatch)?.label || "";

  // Extract home and away names using regex
  const m = /-\s(.*?)\svs\s(.*?)\s–/.exec(selectedLabel);
  const fallbackHome = m?.[1];
  const fallbackAway = m?.[2];

  // Prefer the actual team names from stats if available, otherwise use fallback
  const homeName = stats?.home_team || fallbackHome;
  const awayName = stats?.away_team || fallbackAway;

  // Only enable buttons if both names exist
  const canShoot = Boolean(selectedMatch && homeName && awayName);


  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <ErrorBanner error={globalError} onClose={handleClearError} />

      <h2>Select or Upload a Match</h2>

      <FileUpload
        onFileChange={(e) => setFile(e.target.files[0])}
        onUpload={async () => {
          try {
            const data = await upload();
            if (data) setStats(data);
          } catch (e) {
            setVizError?.(e?.message || "Upload failed");
          }
        }}
        uploading={uploading}
        uploadSuccess={success}
      />

      <MatchSelector
        matches={matches}
        selectedMatch={selectedMatch}
        onChange={async (v) => {
          setSelectedMatch(v);
          try {
            // Only update stats for scoreboard, NOT figData/chart!
            await loadMatchViz(v, setStats);
            setFigData(null); // Clear chart when new match is selected
          } catch (e) {
            setVizError?.(e?.message || "Failed to load match");
          }
        }}
        flipSides={flipSides}
        onFlipChange={setFlipSides}
        onReset={() => {
          setSelectedMatch("");
          setStats({});
          setFigData(null); // Clear chart when reset
        }}
        matchesLoading={matchesLoading}
      />

      <Scoreboard
        stage={stats.competition_stage}
        home={stats.home_team}
        away={stats.away_team}
        score={
          Number.isFinite(stats.home_score) && Number.isFinite(stats.away_score)
            ? `${stats.home_score} - ${stats.away_score}`
            : "-"
        }
        shots={
          Number.isFinite(stats.home_shots) && Number.isFinite(stats.away_shots)
            ? `${stats.home_shots} - ${stats.away_shots}`
            : "-"
        }
        shotsOnTarget={
          Number.isFinite(stats.home_shots_on_target) && Number.isFinite(stats.away_shots_on_target)
            ? `${stats.home_shots_on_target} - ${stats.away_shots_on_target}`
            : "-"
        }
        xg={
          Number.isFinite(stats.home_xg_sum) && Number.isFinite(stats.away_xg_sum)
            ? `${Number(stats.home_xg_sum || 0).toFixed(2)} - ${Number(stats.away_xg_sum || 0).toFixed(2)}`
            : "-"
        }
      />

      <ShotMapButtons
        home={homeName}
        away={awayName}
        onHome={() => canShoot && loadTeamShotmap(selectedMatch, homeName)}
        onAway={() => canShoot && loadTeamShotmap(selectedMatch, awayName)}
        onBoth={() => canShoot && loadBothShotmaps(selectedMatch, homeName, awayName)}
      />

      <PassingNetworkButtons
        home={homeName}
        away={awayName}
        onHomePN={() => canShoot && loadPassingNetwork(selectedMatch, homeName, 1, false)}
        onAwayPN={() => canShoot && loadPassingNetwork(selectedMatch, awayName, 1, true)}
        disabled={!canShoot}
      />

      <ShotMapPlot displayFig={figData} flipSides={flipSides} plotLoading={plotLoading} />
    </div>
  );
}
