import React, { useState, useEffect } from "react";
import useMatchData from "../hooks/useMatchData";
import useUpload from "../hooks/useUpload";
import useVisualization from "../hooks/useVisualization";
import ErrorBanner from "../ErrorBanner";
import MatchSelector from "../MatchSelector";
import ScoreCard from "./ScoreCard";
import MatchFacts from "./MatchFacts";
import ChartPanel from "./ChartPanel";
import KeyMomentsSection from "./KeyMomentsSection";
import GamePhasesSection from "./GamePhasesSection";
import styles from "./MatchViz.module.css";

export default function MatchViz() {
  const { matches, loading: matchesLoading, error: matchesError, setError: setMatchesError } = useMatchData();
  const { error: uploadError, setError: setUploadError } = useUpload();
  const {
    loading: plotLoading,
    loadMatchViz,
    loadTeamShotmap,
    loadBothShotmaps,
    loadPassingNetwork,
    error: vizError, setError: setVizError,
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

  useEffect(() => {
    setGlobalError(matchesError || uploadError || vizError || "");
  }, [matchesError, uploadError, vizError]);

  function handleClearError() {
    setGlobalError("");
    setMatchesError("");
    setUploadError("");
    setVizError && setVizError("");
  }

  // Team names come from the match stats, falling back to the dropdown label
  const selectedLabel = matches.find(m => m.file === selectedMatch)?.label || "";
  const labelTeams = /-\s(.*?)\svs\s(.*?)\s–/.exec(selectedLabel);
  const homeName = stats?.home_team || labelTeams?.[1];
  const awayName = stats?.away_team || labelTeams?.[2];
  const canShoot = Boolean(selectedMatch && homeName && awayName);

  useEffect(() => {
    if (selectedMatch) fetchImportantMoments(selectedMatch);
  }, [selectedMatch, fetchImportantMoments]);

  // Auto-load the both-teams shot map when a match is selected
  useEffect(() => {
    if (canShoot) {
      loadBothShotmaps(selectedMatch, homeName, awayName).then(data => {
        if (data) setShotMapFigData(data);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMatch, homeName, awayName, canShoot]);

  // Auto-load the home team passing network when a match is selected
  useEffect(() => {
    if (canShoot) {
      loadPassingNetwork(selectedMatch, homeName, 1, false).then(data => {
        if (data) setPassNetFigData(data);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMatch, homeName, canShoot]);

  // Wrap a chart loader so it only runs once the teams are known
  const load = (loader, setter) => async () => {
    if (!canShoot) return;
    setter(await loader());
  };

  return (
    <div className={styles.container}>
      <ErrorBanner error={globalError} onClose={handleClearError} />
      <div className={styles.content}>
        {/* Top bar: tournament name and match picker, top left */}
        <div className={styles.topBar}>
          <h1 className={styles.tournamentTitle}>Euro 2020</h1>
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
            <div className={styles.sectionDivider}></div>

            {/* Score card (left) and match facts (right) side by side */}
            <div className={styles.topRow}>
              <ScoreCard stats={stats} matchLabel={selectedLabel} importantMoments={importantMoments} />
              <MatchFacts stats={stats} />
            </div>

            {/* Flip sides applies to both charts */}
            <div className={styles.flipSidesContainerCentered}>
              <label className={styles.flipSidesLabel}>
                <input
                  type="checkbox"
                  checked={flipSides}
                  onChange={(e) => setFlipSides(e.target.checked)}
                  className={styles.flipSidesCheckbox}
                />
                Flip Sides (applies to both)
              </label>
            </div>

            {/* Shot map and passing network, side by side */}
            <div className={styles.chartsRow}>
              <ChartPanel
                title="Shot Map"
                titleClass={styles.shotMapsTitle}
                plotClass={styles.shotMapPlot}
                buttonRowClass={styles.buttonGroup}
                figData={shotMapFigData}
                flipSides={flipSides}
                plotLoading={plotLoading}
                buttons={[
                  { label: `Shot map – ${homeName}`, className: styles.button,
                    onClick: load(() => loadTeamShotmap(selectedMatch, homeName), setShotMapFigData) },
                  { label: `Shot map – ${awayName}`, className: styles.button,
                    onClick: load(() => loadTeamShotmap(selectedMatch, awayName), setShotMapFigData) },
                  { label: "Both Teams Shot Map", className: styles.buttonBoth,
                    onClick: load(() => loadBothShotmaps(selectedMatch, homeName, awayName), setShotMapFigData) },
                ]}
                resetLabel="Reset Shot Map"
                onReset={() => setShotMapFigData(null)}
              />
              <ChartPanel
                title="Passing Network"
                titleClass={styles.passingNetworkTitle}
                plotClass={styles.passingNetworkPlot}
                buttonRowClass={styles.passingNetworkButtons}
                figData={passNetFigData}
                flipSides={flipSides}
                plotLoading={plotLoading}
                buttons={[
                  { label: `${homeName} Network`, className: styles.passingNetworkButton,
                    onClick: load(() => loadPassingNetwork(selectedMatch, homeName, 1, false), setPassNetFigData) },
                  { label: `${awayName} Network`, className: styles.passingNetworkButton,
                    onClick: load(() => loadPassingNetwork(selectedMatch, awayName, 1, true), setPassNetFigData) },
                ]}
                resetLabel="Reset Passing Network"
                onReset={() => setPassNetFigData(null)}
              />
            </div>

            <KeyMomentsSection
              matchFile={selectedMatch}
              moments={importantMoments}
              loading={importantMomentsLoading}
              error={importantMomentsError}
            />

            <GamePhasesSection matchFile={selectedMatch} importantMoments={importantMoments} />
          </>
        )}
      </div>
    </div>
  );
}
