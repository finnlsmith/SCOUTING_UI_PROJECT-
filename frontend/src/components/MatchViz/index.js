import React, { useState, useEffect, Suspense, lazy } from "react";
import useMatchData from "../hooks/useMatchData";
import useUpload from "../hooks/useUpload";
import useVisualization from "../hooks/useVisualization";
import ErrorBanner from "../ErrorBanner";
import MatchSelector from "../MatchSelector";
import Scoreboard from "../Scoreboard";
import { PlotSkeleton } from "../LoadingSkeleton";
import KeyMomentsSection from "./KeyMomentsSection";
import GamePhasesSection from "./GamePhasesSection";
import { formatScoreboardProps } from "./formatScoreboardProps";
import styles from "./MatchViz.module.css";

// Dynamically import heavy component for code splitting
const ShotMapPlot = lazy(() => import("../ShotMapPlot"));

export default function MatchViz() {
  const { matches, loading: matchesLoading, error: matchesError, setError: setMatchesError } = useMatchData();
  const { error: uploadError, setError: setUploadError } = useUpload();
  const {
    loading: plotLoading,
    loadMatchViz,
    loadTeamShotmap,
    loadBothShotmaps,
    loadPassingNetwork,
    error: vizError,
    setError: setVizError,
    importantMoments,
    importantMomentsLoading,
    importantMomentsError,
    fetchImportantMoments,
  } = useVisualization();

  const [selectedMatch, setSelectedMatch] = useState("");
  const [flipSides, setFlipSides] = useState(false);
  const [stats, setStats] = useState({});
  const [globalError, setGlobalError] = useState("");
  const [shotMapFigData, setShotMapFigData] = useState(null);
  const [passNetFigData, setPassNetFigData] = useState(null);
  const [showImportantScenes, setShowImportantScenes] = useState(false);

  useEffect(() => {
    setGlobalError(matchesError || uploadError || vizError || "");
  }, [matchesError, uploadError, vizError]);

  function handleClearError() {
    setGlobalError("");
    setMatchesError("");
    setUploadError("");
    setVizError?.("");
  }

  // Fallback team name logic
  const selectedLabel = matches.find((m) => m.file === selectedMatch)?.label || "";
  const m = /-\s(.*?)\svs\s(.*?)\s–/.exec(selectedLabel);
  const fallbackHome = m?.[1];
  const fallbackAway = m?.[2];
  const homeName = stats?.home_team || fallbackHome;
  const awayName = stats?.away_team || fallbackAway;
  const canShoot = Boolean(selectedMatch && homeName && awayName);

  useEffect(() => {
    if (selectedMatch) fetchImportantMoments(selectedMatch);
  }, [selectedMatch, fetchImportantMoments]);

  return (
    <div className={styles.container}>
      <ErrorBanner error={globalError} onClose={handleClearError} />
      <div className={styles.content}>
        {/* Tournament Title */}
        <h1 className={styles.tournamentTitle}>Euro 2020</h1>

        {/* Match Selection */}
        <div className={styles.matchSelection}>
          <h2 className={styles.sectionTitle}>Select a Match</h2>
          <div className={styles.matchSelectorWrapper}>
            <MatchSelector
              matches={matches}
              selectedMatch={selectedMatch}
              onChange={async (v) => {
                setSelectedMatch(v);
                try {
                  await loadMatchViz(v, setStats);
                } catch (e) {
                  setVizError?.(e?.message || "Failed to load match");
                }
              }}
              flipSides={flipSides}
              onFlipChange={setFlipSides}
              onReset={() => {
                setSelectedMatch("");
                setStats({});
              }}
              matchesLoading={matchesLoading}
            />
          </div>
        </div>

        {selectedMatch && (
          <>
            {/* Main 3-panel row */}
            <div className={styles.mainRow}>
              {/* Match Facts */}
              <div className={styles.matchFacts}>
                <h2 className={styles.matchFactsTitle}>Match Facts</h2>
                <div className={styles.matchFactsCard}>
                  <Scoreboard {...formatScoreboardProps(stats)} />
                </div>
              </div>

              {/* Shot Maps */}
              <div className={styles.shotMaps}>
                <h2 className={styles.shotMapsTitle}>Shot Maps</h2>
                <div className={styles.flipSidesContainer}>
                  <label className={styles.flipSidesLabel}>
                    <input
                      type="checkbox"
                      checked={flipSides}
                      onChange={(e) => setFlipSides(e.target.checked)}
                      className={styles.flipSidesCheckbox}
                    />
                    Flip Sides
                  </label>
                </div>
                <div className={styles.buttonGroup}>
                  <button
                    onClick={async () => {
                      if (!canShoot) return;
                      const data = await loadTeamShotmap(selectedMatch, homeName);
                      setShotMapFigData(data);
                    }}
                    className={styles.button}
                  >
                    Shot map – {homeName}
                  </button>
                  <button
                    onClick={async () => {
                      if (!canShoot) return;
                      const data = await loadTeamShotmap(selectedMatch, awayName);
                      setShotMapFigData(data);
                    }}
                    className={styles.button}
                  >
                    Shot map – {awayName}
                  </button>
                  <button
                    onClick={async () => {
                      if (!canShoot) return;
                      const data = await loadBothShotmaps(selectedMatch, homeName, awayName);
                      setShotMapFigData(data);
                    }}
                    className={styles.buttonBoth}
                  >
                    Both Teams Shot Map
                  </button>
                </div>
                <div className={styles.resetButtonContainer}>
                  <button onClick={() => setShotMapFigData(null)} className={styles.resetButton}>
                    Reset Shot Map
                  </button>
                </div>
                {shotMapFigData && (
                  <div className={styles.shotMapPlot}>
                    <Suspense fallback={<PlotSkeleton />}>
                      <ShotMapPlot
                        displayFig={shotMapFigData}
                        flipSides={flipSides}
                        plotLoading={plotLoading}
                        smaller
                      />
                    </Suspense>
                  </div>
                )}
              </div>

              {/* Passing Network */}
              <div className={styles.passingNetwork}>
                <h2 className={styles.passingNetworkTitle}>Passing Network</h2>
                <div className={styles.passingNetworkButtons}>
                  <button
                    onClick={async () => {
                      if (!canShoot) return;
                      const data = await loadPassingNetwork(selectedMatch, homeName, 1, false);
                      setPassNetFigData(data);
                    }}
                    className={styles.passingNetworkButton}
                  >
                    {homeName} Network
                  </button>
                  <button
                    onClick={async () => {
                      if (!canShoot) return;
                      const data = await loadPassingNetwork(selectedMatch, awayName, 1, true);
                      setPassNetFigData(data);
                    }}
                    className={styles.passingNetworkButton}
                  >
                    {awayName} Network
                  </button>
                </div>
                <div className={styles.resetButtonContainer}>
                  <button onClick={() => setPassNetFigData(null)} className={styles.resetButton}>
                    Reset Passing Network
                  </button>
                </div>
                {passNetFigData && (
                  <div className={styles.passingNetworkPlot}>
                    <Suspense fallback={<PlotSkeleton />}>
                      <ShotMapPlot
                        displayFig={passNetFigData}
                        flipSides={flipSides}
                        plotLoading={plotLoading}
                        customSize={{ width: 540, height: 380 }}
                      />
                    </Suspense>
                  </div>
                )}
              </div>
            </div>

            {/* Key Moments Section */}
            <KeyMomentsSection
              selectedMatch={selectedMatch}
              importantMoments={importantMoments}
              importantMomentsLoading={importantMomentsLoading}
              importantMomentsError={importantMomentsError}
              showImportantScenes={showImportantScenes}
              onToggleScenes={setShowImportantScenes}
            />

            {/* Game Phases Section */}
            <GamePhasesSection selectedMatch={selectedMatch} />
          </>
        )}
      </div>
    </div>
  );
}
