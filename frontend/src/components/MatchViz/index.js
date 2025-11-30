import React, { useState, useEffect, Suspense, lazy } from "react";
import useMatchData from "../hooks/useMatchData";
import useUpload from "../hooks/useUpload";
import useVisualization from "../hooks/useVisualization";
import ErrorBanner from "../ErrorBanner";
// import FileUpload from "../FileUpload";
import MatchSelector from "../MatchSelector";
import Scoreboard from "../Scoreboard";
// import ShotMapButtons from "../ShotMapButtons";
// import PassingNetworkButtons from "../PassingNetworkButtons";
import { PlotSkeleton } from "../LoadingSkeleton";
import styles from "./MatchViz.module.css";

// Dynamically import heavy component for code splitting
const ShotMapPlot = lazy(() => import("../ShotMapPlot"));

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000/api').replace(/\/+$/, '');

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
  const [selectedMomentIdx, setSelectedMomentIdx] = useState(null);
  const [sceneImageBase64, setSceneImageBase64] = useState(null);
  const [sceneLoading, setSceneLoading] = useState(false);
  const [sceneError, setSceneError] = useState(null);
  const [showImportantScenes, setShowImportantScenes] = useState(false);
  const [gamePhases, setGamePhases] = useState([]);
  const [gamePhaseLoading, setGamePhaseLoading] = useState(false);
  const [gamePhaseError, setGamePhaseError] = useState(null);
  const [gamePhaseTeams, setGamePhaseTeams] = useState({ home: "", away: "" });
  const [gamePhaseMetrics, setGamePhaseMetrics] = useState([]);

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
  const selectedLabel = matches.find(m => m.file === selectedMatch)?.label || "";
  const m = /-\s(.*?)\svs\s(.*?)\s–/.exec(selectedLabel);
  const fallbackHome = m?.[1];
  const fallbackAway = m?.[2];
  const homeName = stats?.home_team || fallbackHome;
  const awayName = stats?.away_team || fallbackAway;
  const canShoot = Boolean(selectedMatch && homeName && awayName);

  useEffect(() => {
    if (selectedMatch) fetchImportantMoments(selectedMatch);
  }, [selectedMatch, fetchImportantMoments]);

  useEffect(() => {
    if (!showImportantScenes || selectedMomentIdx === null || importantMoments.length === 0 || !selectedMatch) {
      setSceneImageBase64(null);
      setSceneError(null);
      setSceneLoading(false);
      return;
    }
    const m = importantMoments[selectedMomentIdx];
    if (!m) return;
    setSceneImageBase64(null);
    setSceneLoading(true);
    setSceneError(null);
    fetch(`${BACKEND_URL}/match/${selectedMatch}/possession_scene?possession=${m.possession}`)
      .then(res => res.json())
      .then(res => {
        if (res.image_base64) {
          setSceneImageBase64(res.image_base64);
        } else if (res.error) {
          setSceneError(res.error);
        } else {
          setSceneError("No image returned");
        }
      })
      .catch(() => setSceneError("Failed to fetch possession scene"))
      .finally(() => setSceneLoading(false));
  }, [selectedMomentIdx, selectedMatch, showImportantScenes, importantMoments]);

  useEffect(() => {
    if (!selectedMatch) {
      setGamePhases([]); setGamePhaseError(null); setGamePhaseTeams({ home: "", away: "" }); setGamePhaseMetrics([]);
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

  useEffect(() => {
    if (showImportantScenes && importantMoments.length > 0) {
      setSelectedMomentIdx(0);
    } else {
      setSelectedMomentIdx(null);
    }
  }, [importantMoments, selectedMatch, showImportantScenes]);

  const handleMomentClick = idx => {
    setSelectedMomentIdx(idx);
    setShowImportantScenes(true);
  };
  const handlePrev = () => setSelectedMomentIdx(idx => idx > 0 ? idx - 1 : 0);
  const handleNext = () => setSelectedMomentIdx(idx => idx < importantMoments.length - 1 ? idx + 1 : idx);
  const handleShowImportantScenesToggle = () => setShowImportantScenes(s => !s);

  return (
    <div className={styles.container}>
      <ErrorBanner error={globalError} onClose={handleClearError} />
      <div className={styles.content}>
        {/* Tournament Title and Match Selection Header */}
        <div className={styles.pageHeader}>
          <h1 className={styles.tournamentTitle}>Euro 2020</h1>
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
                    // setFigData(null); // This line was commented out in the original file
                  } catch (e) {
                    setVizError?.(e?.message || "Failed to load match");
                  }
                }}
                flipSides={flipSides}
                onFlipChange={setFlipSides}
                onReset={() => {
                  setSelectedMatch("");
                  setStats({});
                  // setFigData(null); // This line was commented out in the original file
                }}
                matchesLoading={matchesLoading}
              />
            </div>
          </div>
        </div>

        {selectedMatch && (
          <>
            <div className={styles.sectionDivider}></div>
            
            {/* Entire Match Section */}
            <h2 className={styles.entireMatchTitle}>Entire Match</h2>
            
            {/* Score Banner */}
            <div className={styles.scoreBanner}>
              <span className={styles.scoreText}>
                {stats.home_team} {Number.isFinite(stats.home_score) && Number.isFinite(stats.away_score) ? `${stats.home_score} - ${stats.away_score}` : "0 - 0"} {stats.away_team}
              </span>
              {stats.competition_stage && <span className={styles.stageText}>{stats.competition_stage}</span>}
              {selectedLabel && <span className={styles.dateText}>{selectedLabel.match(/\d{4}-\d{2}-\d{2}/)?.[0] || ""}</span>}
            </div>

            {/* Visualization Header */}
            <div className={styles.visualizationHeader}>
              <span className={styles.vizHeaderScore}>
                {stats.home_team} {Number.isFinite(stats.home_score) && Number.isFinite(stats.away_score) ? `${stats.home_score} - ${stats.away_score}` : "0 - 0"} {stats.away_team}
              </span>
              <span className={styles.vizHeaderSeparator}>|</span>
              {stats.competition_stage && <span className={styles.vizHeaderStage}>{stats.competition_stage}</span>}
              {selectedLabel && stats.competition_stage && <span className={styles.vizHeaderSeparator}>|</span>}
              {selectedLabel && <span className={styles.vizHeaderDate}>{selectedLabel.match(/\d{4}-\d{2}-\d{2}/)?.[0] || ""}</span>}
            </div>

            {/* Main 3-panel row */}
            <div className={styles.mainRow}>
              {/* Match Facts */}
              <div className={styles.matchFacts}>
                <h2 className={styles.matchFactsTitle}>Match Facts</h2>
                <div className={styles.matchFactsCard}>
                  <Scoreboard
                    stage={stats.competition_stage}
                    home={stats.home_team}
                    away={stats.away_team}
                    score={Number.isFinite(stats.home_score) && Number.isFinite(stats.away_score) ? `${stats.home_score} - ${stats.away_score}` : "-"}
                    shots={(stats.home_shots !== null && stats.away_shots !== null && stats.home_shots !== undefined && stats.away_shots !== undefined)
                      ? `${stats.home_shots} - ${stats.away_shots}` : "-"}
                    shotsOnTarget={(stats.home_shots_on_target !== null && stats.away_shots_on_target !== null && stats.home_shots_on_target !== undefined && stats.away_shots_on_target !== undefined)
                      ? `${stats.home_shots_on_target} - ${stats.away_shots_on_target}` : "-"}
                    xg={(stats.home_xg_sum && stats.away_xg_sum)
                        ? `${stats.home_xg_sum} - ${stats.away_xg_sum}`
                        : "-"}
                    bigChances={(Number.isFinite(stats.home_big_chances) && Number.isFinite(stats.away_big_chances)) ? `${stats.home_big_chances} - ${stats.away_big_chances}` : "-"}
                    okChances={(Number.isFinite(stats.home_ok_chances) && Number.isFinite(stats.away_ok_chances)) ? `${stats.home_ok_chances} - ${stats.away_ok_chances}` : "-"}
                    fouls={(Number.isFinite(stats.home_fouls) && Number.isFinite(stats.away_fouls)) ? `${stats.home_fouls} - ${stats.away_fouls}` : "-"}
                    cardsLeft={(Number.isFinite(stats.home_cards_total) && Number.isFinite(stats.home_cards_yellow) && Number.isFinite(stats.home_cards_red)) ? `${stats.home_cards_total} (${stats.home_cards_yellow}/${stats.home_cards_red})` : "-"}
                    cardsRight={(Number.isFinite(stats.away_cards_total) && Number.isFinite(stats.away_cards_yellow) && Number.isFinite(stats.away_cards_red)) ? `${stats.away_cards_total} (${stats.away_cards_yellow}/${stats.away_cards_red})` : "-"}
                    boxEntries={(Number.isFinite(stats.home_box_entries) && Number.isFinite(stats.away_box_entries)) ? `${stats.home_box_entries} - ${stats.away_box_entries}` : "-"}
                  />
                </div>
              </div>

              {/* Shot Maps, with buttons */}
              <div className={styles.shotMaps}>
                <h2 className={styles.shotMapsTitle}>Shot Map</h2>
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
                  <button onClick={async () => {
                    if (!canShoot) return;
                    const data = await loadTeamShotmap(selectedMatch, homeName);
                    setShotMapFigData(data);
                  }} className={styles.button}>Shot map – {homeName}</button>
                  <button onClick={async () => {
                    if (!canShoot) return;
                    const data = await loadTeamShotmap(selectedMatch, awayName);
                    setShotMapFigData(data);
                  }} className={styles.button}>Shot map – {awayName}</button>
                  <button onClick={async () => {
                    if (!canShoot) return;
                    const data = await loadBothShotmaps(selectedMatch, homeName, awayName);
                    setShotMapFigData(data);
                  }} className={styles.buttonBoth}>Both Teams Shot Map</button>
                </div>
                <div className={styles.resetButtonContainer}>
                  <button 
                    onClick={() => setShotMapFigData(null)}
                    className={styles.resetButton}
                  >Reset Shot Map</button>
                </div>
                {shotMapFigData && (
                  <div className={styles.shotMapPlot}>
                    <Suspense fallback={<PlotSkeleton />}>
                      <ShotMapPlot displayFig={shotMapFigData} flipSides={flipSides} plotLoading={plotLoading} smaller />
                    </Suspense>
                  </div>
                )}
              </div>

              {/* Passing Network (right) */}
              <div className={styles.passingNetwork}>
                <h2 className={styles.passingNetworkTitle}>Passing Network</h2>
                <div className={styles.passingNetworkButtons}>
                  <button onClick={async () => {
                    if (!canShoot) return;
                    const data = await loadPassingNetwork(selectedMatch, homeName, 1, false);
                    setPassNetFigData(data);
                  }} className={styles.passingNetworkButton}>{homeName} Network</button>
                  <button onClick={async () => {
                    if (!canShoot) return;
                    const data = await loadPassingNetwork(selectedMatch, awayName, 1, true);
                    setPassNetFigData(data);
                  }} className={styles.passingNetworkButton}>{awayName} Network</button>
                </div>
                <div className={styles.resetButtonContainer}>
                  <button 
                    onClick={() => setPassNetFigData(null)}
                    className={styles.resetButton}
                  >Reset Passing Network</button>
                </div>
                {passNetFigData && (
                  <div className={styles.passingNetworkPlot}>
                    <Suspense fallback={<PlotSkeleton />}>
                      <ShotMapPlot displayFig={passNetFigData} flipSides={flipSides} plotLoading={plotLoading} customSize={{ width: 540, height: 380 }} />
                    </Suspense>
                  </div>
                )}
              </div>
            </div>
            
            <div className={styles.sectionDivider}></div>
            
            {/* Key Moments Section */}
            <div className={styles.keyMoments}>
              <h2 className={styles.keyMomentsTitle}>Key Moments <span className={styles.showScenesLabel}><input type="checkbox" checked={showImportantScenes} onChange={handleShowImportantScenesToggle} className={styles.showScenesCheckbox} />Show Scenes</span></h2>
              <div className={styles.momentsContainer}>
                {/* Moments Table */}
                <div className={styles.momentsTable}>
                  {importantMomentsLoading && <div className={styles.loadingText}>Loading moments...</div>}
                  {importantMomentsError && <div className={styles.errorText}>{importantMomentsError}</div>}
                  {!importantMomentsLoading && !importantMomentsError && Array.isArray(importantMoments) && importantMoments.length === 0 && (
                    <div className={styles.emptyText}>No important moments found for match.</div>
                  )}
                  {!importantMomentsLoading && !importantMomentsError && Array.isArray(importantMoments) && importantMoments.length > 0 && (
                    <table className={styles.momentsTableElement}>
                      <thead>
                        <tr className={styles.tableHeader}>
                          <th className={styles.tableHeaderCell}>#</th>
                          <th className={styles.tableHeaderCell}>When</th>
                          <th className={styles.tableHeaderCell}>Who</th>
                          <th className={styles.tableHeaderCell}>Type</th>
                          <th className={styles.tableHeaderCell}>xG</th>
                          <th className={styles.tableHeaderCell}>Outcome</th>
                          <th className={styles.tableHeaderCell}>Poss.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importantMoments.map((m, idx) => (
                          <tr
                            key={idx}
                            onClick={() => handleMomentClick(idx)}
                            className={selectedMomentIdx === idx && showImportantScenes ? styles.tableRowSelected : styles.tableRow}
                          >
                            <td className={styles.tableCell}>{idx + 1}</td>
                            <td className={styles.tableCell}>{m.when}</td>
                            <td className={styles.tableCell}>{m.who}</td>
                            <td className={styles.tableCell}>{m.event_type}</td>
                            <td className={styles.tableCell}>{m.xg !== undefined && m.xg !== null ? m.xg : ''}</td>
                            <td className={styles.tableCell}>{m.outcome}</td>
                            <td className={styles.tableCell}>{m.possession}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                {/* Scene Viewer */}
                {showImportantScenes && importantMoments.length > 0 && selectedMomentIdx !== null && (
                  <div className={styles.sceneViewer}>
                    <div className={styles.sceneNav}>
                      <button onClick={handlePrev} disabled={selectedMomentIdx <= 0} className={styles.sceneNavButton}>{'←'}</button>
                      <span className={styles.sceneNavLabel}>
                        Moment {selectedMomentIdx + 1} of {importantMoments.length} (Possession {importantMoments[selectedMomentIdx]?.possession})
                      </span>
                      <button onClick={handleNext} disabled={selectedMomentIdx >= importantMoments.length - 1} className={styles.sceneNavButton}>{'→'}</button>
                    </div>
                    <div className={styles.sceneStatus}>
                      {sceneLoading && 'Loading scene...'}
                      {sceneError && sceneError}
                    </div>
                    {sceneImageBase64 && (
                      <img
                        src={`data:image/png;base64,${sceneImageBase64}`}
                        alt="Possession Scene"
                        className={styles.sceneImage}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className={styles.sectionDivider}></div>
            
            {/* Game Phases Section */}
            <div className={styles.gamePhases}>
              <h2 className={styles.gamePhasesTitle}>Game Phases</h2>
              {gamePhaseLoading && <div className={styles.gamePhasesLoading}>Loading phases...</div>}
              {gamePhaseError && <div className={styles.gamePhasesError}>{gamePhaseError}</div>}
              {!gamePhaseLoading && !gamePhaseError && gamePhases.length === 0 && (
                <div className={styles.gamePhasesEmpty}>
                  No phases detected for match.
                </div>
              )}
              {!gamePhaseLoading && !gamePhaseError && gamePhases.length > 0 && (
                <div className={styles.gamePhasesList}>
                  {gamePhases.map((ph, idx) => {
                    const m = (gamePhaseMetrics || []).find(mm => mm.phase_idx === ph.phase_idx);
                    return (
                    <div key={idx} className={styles.gamePhaseCard}>
                      <div className={styles.gamePhaseHeader}>
                        <div className={styles.gamePhaseTitle}>Game Phase {ph.phase_idx}</div>
                        <div className={styles.gamePhaseTime}>
                          <b>From: </b>{`${ph.start_minute}:${String(ph.start_second).padStart(2, '0')}`} <b>— To: </b>{ph.end_minute !== null ? `${ph.end_minute}:${String(ph.end_second).padStart(2,'0')}` : 'End'}
                        </div>
                        <div className={styles.gamePhaseScore}>
                          <b>Score: </b>{gamePhaseTeams.home} {ph.score_start} {gamePhaseTeams.away}
                          {ph.score_end ? ` → ${ph.score_end}` : ''}
                        </div>
                        {ph.goal_info && ph.goal_info.scorer && (
                          <div className={styles.gamePhaseGoalInfo}>
                            Goal Event: <b>{ph.goal_info.event_type}</b>{ph.goal_info.own_goal_team ? ` (Own goal by ${ph.goal_info.own_goal_team})` : ''}, scored by <b>{ph.goal_info.scorer}</b>
                          </div>
                        )}
                        {Array.isArray(ph.break_reasons) && ph.break_reasons.length > 0 && (
                          <div className={styles.gamePhaseBreakReasons}>
                            Phase ended by: {ph.break_reasons.map(r => r === "half_end" ? "Half Ended" : r).join(', ')}
                          </div>
                        )}
                      </div>
                      
                      {m && (
                        <div className={styles.phaseTwoColumnLayout}>
                          {/* Left column: Stats table */}
                          <div className={styles.phaseStatsColumn}>
                            <div className={styles.metricsContainer}>
                            <table className={styles.phaseMetricsTable}>
                              <thead>
                                <tr>
                                  <th className={styles.phaseMetricsHeaderCell}>Statistic</th>
                                  <th className={styles.phaseMetricsHeaderCell}>{gamePhaseTeams.home}</th>
                                  <th className={styles.phaseMetricsHeaderCell}>{gamePhaseTeams.away}</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className={styles.phaseMetricsRow}>
                                  <td className={styles.phaseMetricsLabelCell}>Goals</td>
                                  <td className={styles.phaseMetricsValueCell}>{m.goals?.[gamePhaseTeams.home] ?? 0}</td>
                                  <td className={styles.phaseMetricsValueCell}>{m.goals?.[gamePhaseTeams.away] ?? 0}</td>
                                </tr>
                                <tr className={styles.phaseMetricsRow}>
                                  <td className={styles.phaseMetricsLabelCell}>Shots (total)</td>
                                  <td className={styles.phaseMetricsValueCell}>{m.shots_summary?.[gamePhaseTeams.home]?.total ?? 0}</td>
                                  <td className={styles.phaseMetricsValueCell}>{m.shots_summary?.[gamePhaseTeams.away]?.total ?? 0}</td>
                                </tr>
                                <tr className={styles.phaseMetricsRow}>
                                  <td className={styles.phaseMetricsLabelCell}>Shots on Target</td>
                                  <td className={styles.phaseMetricsValueCell}>{m.shots_summary?.[gamePhaseTeams.home]?.on_target ?? 0}</td>
                                  <td className={styles.phaseMetricsValueCell}>{m.shots_summary?.[gamePhaseTeams.away]?.on_target ?? 0}</td>
                                </tr>
                                <tr className={styles.phaseMetricsRow}>
                                  <td className={styles.phaseMetricsLabelCell}>Possession %</td>
                                  <td className={styles.phaseMetricsValueCell}>{m.possession_pct_by_passes?.[gamePhaseTeams.home] ?? 0}%</td>
                                  <td className={styles.phaseMetricsValueCell}>{m.possession_pct_by_passes?.[gamePhaseTeams.away] ?? 0}%</td>
                                </tr>
                                <tr className={styles.phaseMetricsRow}>
                                  <td className={styles.phaseMetricsLabelCell}>Box Entries</td>
                                  <td className={styles.phaseMetricsValueCell}>{m.box_entries?.[gamePhaseTeams.home] ?? 0}</td>
                                  <td className={styles.phaseMetricsValueCell}>{m.box_entries?.[gamePhaseTeams.away] ?? 0}</td>
                                </tr>
                                <tr className={styles.phaseMetricsRow}>
                                  <td className={styles.phaseMetricsLabelCell}>Final Third Entries</td>
                                  <td className={styles.phaseMetricsValueCell}>{m.final_third_entries?.[gamePhaseTeams.home] ?? 0}</td>
                                  <td className={styles.phaseMetricsValueCell}>{m.final_third_entries?.[gamePhaseTeams.away] ?? 0}</td>
                                </tr>
                                <tr className={styles.phaseMetricsRow}>
                                  <td className={styles.phaseMetricsLabelCell}>Fouls</td>
                                  <td className={styles.phaseMetricsValueCell}>{m.fouls?.[gamePhaseTeams.home] ?? 0}</td>
                                  <td className={styles.phaseMetricsValueCell}>{m.fouls?.[gamePhaseTeams.away] ?? 0}</td>
                                </tr>
                                <tr className={styles.phaseMetricsRow}>
                                  <td className={styles.phaseMetricsLabelCell}>Cards (Yellow / Red)</td>
                                  <td className={styles.phaseMetricsValueCell}>{m.cards?.[gamePhaseTeams.home]?.yellow ?? 0} / {m.cards?.[gamePhaseTeams.home]?.red ?? 0}</td>
                                  <td className={styles.phaseMetricsValueCell}>{m.cards?.[gamePhaseTeams.away]?.yellow ?? 0} / {m.cards?.[gamePhaseTeams.away]?.red ?? 0}</td>
                                </tr>
                                <tr className={styles.phaseMetricsRow}>
                                  <td className={styles.phaseMetricsLabelCell}>Chances (OK / Good)</td>
                                  <td className={styles.phaseMetricsValueCell}>{m.chances?.[gamePhaseTeams.home]?.ok ?? 0} / {m.chances?.[gamePhaseTeams.home]?.good ?? 0}</td>
                                  <td className={styles.phaseMetricsValueCell}>{m.chances?.[gamePhaseTeams.away]?.ok ?? 0} / {m.chances?.[gamePhaseTeams.away]?.good ?? 0}</td>
                                </tr>
                                <tr className={styles.phaseMetricsRow}>
                                  <td className={styles.phaseMetricsLabelCell}>Penalties</td>
                                  <td className={styles.phaseMetricsValueCell}>{m.penalties?.[gamePhaseTeams.home] ?? 0}</td>
                                  <td className={styles.phaseMetricsValueCell}>{m.penalties?.[gamePhaseTeams.away] ?? 0}</td>
                                </tr>
                              </tbody>
                            </table>
                            </div>
                          </div>
                          
                          {/* Right column: Visualizations */}
                          <div className={styles.phaseVisualizationsColumn}>
                            {/* Key Event Maps (shots, cards, own goals) */}
                            {m.shot_map_data && (
                              <div className={styles.shotMapsContainer}>
                                <h3 className={styles.shotMapsTitle}>Key Event Maps (shots, cards, own goals)</h3>
                                <div className={styles.shotMapsGrid}>
                                  {/* Home team event map */}
                                  <div className={styles.shotMapCard}>
                                    <div className={styles.shotMapTeamLabel}>{gamePhaseTeams.home}</div>
                                    <svg viewBox="0 0 120 80" className={styles.shotMapSvg}>
                                      {/* Pitch outline */}
                                      <rect x="0" y="0" width="120" height="80" fill="#f9f9f9" stroke="#888" strokeWidth="0.5" />
                                      {/* Half line */}
                                      <line x1="60" y1="0" x2="60" y2="80" stroke="#888" strokeWidth="0.5" />
                                      {/* Penalty boxes (18-yard) */}
                                      <rect x="0" y="18" width="18" height="44" fill="none" stroke="#888" strokeWidth="0.5" />
                                      <rect x="102" y="18" width="18" height="44" fill="none" stroke="#888" strokeWidth="0.5" />
                                      {/* 6-yard boxes */}
                                      <rect x="0" y="30" width="6" height="20" fill="none" stroke="#888" strokeWidth="0.5" />
                                      <rect x="114" y="30" width="6" height="20" fill="none" stroke="#888" strokeWidth="0.5" />
                                      {/* Penalty spots */}
                                      <circle cx="12" cy="40" r="0.8" fill="#888" />
                                      <circle cx="108" cy="40" r="0.8" fill="#888" />
                                      {/* Goal indicators */}
                                      <rect x="0" y="36" width="0.5" height="8" fill="#333" stroke="#333" strokeWidth="0.3" />
                                      <rect x="119.5" y="36" width="0.5" height="8" fill="#333" stroke="#333" strokeWidth="0.3" />
                                      
                                      {/* Plot events */}
                                      {(m.shot_map_data[gamePhaseTeams.home] || []).map((event, eventIdx) => {
                                        if (event.event_type === 'red_card') {
                                          return (
                                            <rect
                                              key={eventIdx}
                                              x={event.x - 2.5}
                                              y={80 - event.y - 2.5}
                                              width="5"
                                              height="5"
                                              fill={event.color}
                                              stroke="black"
                                              strokeWidth="0.5"
                                              opacity="0.9"
                                            >
                                              <title>{`${event.player}\nRed Card`}</title>
                                            </rect>
                                          );
                                        } else if (event.event_type === 'own_goal') {
                                          return (
                                            <g key={eventIdx}>
                                              <line x1={event.x - 3} y1={80 - event.y - 3} x2={event.x + 3} y2={80 - event.y + 3} stroke={event.color} strokeWidth="1.5" />
                                              <line x1={event.x - 3} y1={80 - event.y + 3} x2={event.x + 3} y2={80 - event.y - 3} stroke={event.color} strokeWidth="1.5" />
                                              <title>{`${event.player}\nOwn Goal For`}</title>
                                            </g>
                                          );
                                        } else {
                                          // Shot event - render circle with optional outcome indicators
                                          const isBlocked = event.outcome === 'Blocked';
                                          const isOffTarget = event.outcome === 'Off T' || event.outcome === 'Wayward';
                                          
                                          return (
                                            <g key={eventIdx}>
                                              <circle
                                                cx={event.x}
                                                cy={80 - event.y}
                                                r="2.5"
                                                fill={event.color}
                                                stroke="black"
                                                strokeWidth="0.3"
                                                opacity="0.85"
                                              >
                                                <title>{`${event.player}\nxG: ${event.xg}\n${event.outcome}`}</title>
                                              </circle>
                                              
                                              {/* Red X for blocked shots */}
                                              {isBlocked && (
                                                <>
                                                  <line x1={event.x - 2} y1={80 - event.y - 2} x2={event.x + 2} y2={80 - event.y + 2} stroke="red" strokeWidth="1" />
                                                  <line x1={event.x - 2} y1={80 - event.y + 2} x2={event.x + 2} y2={80 - event.y - 2} stroke="red" strokeWidth="1" />
                                                </>
                                              )}
                                              
                                              {/* Red unfilled circle for off target shots */}
                                              {isOffTarget && (
                                                <circle
                                                  cx={event.x}
                                                  cy={80 - event.y}
                                                  r="4"
                                                  fill="none"
                                                  stroke="red"
                                                  strokeWidth="0.8"
                                                />
                                              )}
                                            </g>
                                          );
                                        }
                                      })}
                                    </svg>
                                  </div>
                                  
                                  {/* Away team event map */}
                                  <div className={styles.shotMapCard}>
                                    <div className={styles.shotMapTeamLabel}>{gamePhaseTeams.away}</div>
                                    <svg viewBox="0 0 120 80" className={styles.shotMapSvg}>
                                      {/* Pitch outline */}
                                      <rect x="0" y="0" width="120" height="80" fill="#f9f9f9" stroke="#888" strokeWidth="0.5" />
                                      {/* Half line */}
                                      <line x1="60" y1="0" x2="60" y2="80" stroke="#888" strokeWidth="0.5" />
                                      {/* Penalty boxes (18-yard) */}
                                      <rect x="0" y="18" width="18" height="44" fill="none" stroke="#888" strokeWidth="0.5" />
                                      <rect x="102" y="18" width="18" height="44" fill="none" stroke="#888" strokeWidth="0.5" />
                                      {/* 6-yard boxes */}
                                      <rect x="0" y="30" width="6" height="20" fill="none" stroke="#888" strokeWidth="0.5" />
                                      <rect x="114" y="30" width="6" height="20" fill="none" stroke="#888" strokeWidth="0.5" />
                                      {/* Penalty spots */}
                                      <circle cx="12" cy="40" r="0.8" fill="#888" />
                                      <circle cx="108" cy="40" r="0.8" fill="#888" />
                                      {/* Goal indicators */}
                                      <rect x="0" y="36" width="0.5" height="8" fill="#333" stroke="#333" strokeWidth="0.3" />
                                      <rect x="119.5" y="36" width="0.5" height="8" fill="#333" stroke="#333" strokeWidth="0.3" />
                                      
                                      {/* Plot events */}
                                      {(m.shot_map_data[gamePhaseTeams.away] || []).map((event, eventIdx) => {
                                        if (event.event_type === 'red_card') {
                                          return (
                                            <rect
                                              key={eventIdx}
                                              x={event.x - 2.5}
                                              y={80 - event.y - 2.5}
                                              width="5"
                                              height="5"
                                              fill={event.color}
                                              stroke="black"
                                              strokeWidth="0.5"
                                              opacity="0.9"
                                            >
                                              <title>{`${event.player}\nRed Card`}</title>
                                            </rect>
                                          );
                                        } else if (event.event_type === 'own_goal') {
                                          return (
                                            <g key={eventIdx}>
                                              <line x1={event.x - 3} y1={80 - event.y - 3} x2={event.x + 3} y2={80 - event.y + 3} stroke={event.color} strokeWidth="1.5" />
                                              <line x1={event.x - 3} y1={80 - event.y + 3} x2={event.x + 3} y2={80 - event.y - 3} stroke={event.color} strokeWidth="1.5" />
                                              <title>{`${event.player}\nOwn Goal For`}</title>
                                            </g>
                                          );
                                        } else {
                                          // Shot event - render circle with optional outcome indicators
                                          const isBlocked = event.outcome === 'Blocked';
                                          const isOffTarget = event.outcome === 'Off T' || event.outcome === 'Wayward';
                                          
                                          return (
                                            <g key={eventIdx}>
                                              <circle
                                                cx={event.x}
                                                cy={80 - event.y}
                                                r="2.5"
                                                fill={event.color}
                                                stroke="black"
                                                strokeWidth="0.3"
                                                opacity="0.85"
                                              >
                                                <title>{`${event.player}\nxG: ${event.xg}\n${event.outcome}`}</title>
                                              </circle>
                                              
                                              {/* Red X for blocked shots */}
                                              {isBlocked && (
                                                <>
                                                  <line x1={event.x - 2} y1={80 - event.y - 2} x2={event.x + 2} y2={80 - event.y + 2} stroke="red" strokeWidth="1" />
                                                  <line x1={event.x - 2} y1={80 - event.y + 2} x2={event.x + 2} y2={80 - event.y - 2} stroke="red" strokeWidth="1" />
                                                </>
                                              )}
                                              
                                              {/* Red unfilled circle for off target shots */}
                                              {isOffTarget && (
                                                <circle
                                                  cx={event.x}
                                                  cy={80 - event.y}
                                                  r="4"
                                                  fill="none"
                                                  stroke="red"
                                                  strokeWidth="0.8"
                                                />
                                              )}
                                            </g>
                                          );
                                        }
                                      })}
                                    </svg>
                                  </div>
                                </div>
                                <div className={styles.shotMapLegend}>
                                  <span><span className={styles.legendDot} style={{backgroundColor: 'green'}}></span> Goal</span>
                                  <span><span className={styles.legendDot} style={{backgroundColor: 'yellow'}}></span> High xG (≥0.27)</span>
                                  <span><span className={styles.legendDot} style={{backgroundColor: 'orange'}}></span> Med xG (0.08-0.27)</span>
                                  <span><span className={styles.legendDot} style={{backgroundColor: 'black'}}></span> Low xG (&lt;0.08)</span>
                                  <span><span className={styles.legendSquare}></span> Red Card</span>
                                  <span><span className={styles.legendX}></span> Own Goal For</span>
                                </div>
                              </div>
                            )}
                            
                            {/* Box Entry Maps for each team */}
                            {m.box_entry_locations && (
                              <div className={styles.shotMapsContainer}>
                                <h3 className={styles.shotMapsTitle}>Box Entry Maps</h3>
                                <div className={styles.shotMapsGrid}>
                                  {/* Home team box entry map */}
                                  <div className={styles.shotMapCard}>
                                    <div className={styles.shotMapTeamLabel}>{gamePhaseTeams.home}</div>
                                    <svg viewBox="0 0 120 80" className={styles.shotMapSvg}>
                                      {/* Pitch outline */}
                                      <rect x="0" y="0" width="120" height="80" fill="#f9f9f9" stroke="#888" strokeWidth="0.5" />
                                      {/* Half line */}
                                      <line x1="60" y1="0" x2="60" y2="80" stroke="#888" strokeWidth="0.5" />
                                      {/* Penalty boxes - attacking box highlighted */}
                                      <rect x="102" y="18" width="18" height="44" fill="rgba(255, 200, 200, 0.3)" stroke="#888" strokeWidth="0.8" />
                                      <rect x="0" y="18" width="18" height="44" fill="none" stroke="#888" strokeWidth="0.5" />
                                      {/* 6-yard boxes */}
                                      <rect x="0" y="30" width="6" height="20" fill="none" stroke="#888" strokeWidth="0.5" />
                                      <rect x="114" y="30" width="6" height="20" fill="none" stroke="#888" strokeWidth="0.5" />
                                      {/* Penalty spots */}
                                      <circle cx="12" cy="40" r="0.8" fill="#888" />
                                      <circle cx="108" cy="40" r="0.8" fill="#888" />
                                      {/* Goal indicators */}
                                      <rect x="0" y="36" width="0.5" height="8" fill="#333" stroke="#333" strokeWidth="0.3" />
                                      <rect x="119.5" y="36" width="0.5" height="8" fill="#333" stroke="#333" strokeWidth="0.3" />
                                      
                                      {/* Plot box entries */}
                                      {(m.box_entry_locations[gamePhaseTeams.home] || []).map((entry, entryIdx) => (
                                        <g key={entryIdx}>
                                          <line
                                            x1={entry.x1}
                                            y1={80 - entry.y1}
                                            x2={entry.x2}
                                            y2={80 - entry.y2}
                                            stroke={entry.type === 'pass' ? '#2196F3' : '#FF9800'}
                                            strokeWidth="1.5"
                                            strokeDasharray={entry.type === 'pass' ? '2,2' : '0'}
                                            opacity="0.7"
                                          />
                                          <circle
                                            cx={entry.x2}
                                            cy={80 - entry.y2}
                                            r="2"
                                            fill={entry.type === 'pass' ? '#2196F3' : '#FF9800'}
                                            stroke="black"
                                            strokeWidth="0.3"
                                            opacity="0.75"
                                          >
                                            <title>{entry.type === 'pass' ? 'Pass into box' : 'Carry into box'}</title>
                                          </circle>
                                        </g>
                                      ))}
                                    </svg>
                                  </div>
                                  
                                  {/* Away team box entry map */}
                                  <div className={styles.shotMapCard}>
                                    <div className={styles.shotMapTeamLabel}>{gamePhaseTeams.away}</div>
                                    <svg viewBox="0 0 120 80" className={styles.shotMapSvg}>
                                      {/* Pitch outline */}
                                      <rect x="0" y="0" width="120" height="80" fill="#f9f9f9" stroke="#888" strokeWidth="0.5" />
                                      {/* Half line */}
                                      <line x1="60" y1="0" x2="60" y2="80" stroke="#888" strokeWidth="0.5" />
                                      {/* Penalty boxes - attacking box highlighted */}
                                      <rect x="102" y="18" width="18" height="44" fill="rgba(255, 200, 200, 0.3)" stroke="#888" strokeWidth="0.8" />
                                      <rect x="0" y="18" width="18" height="44" fill="none" stroke="#888" strokeWidth="0.5" />
                                      {/* 6-yard boxes */}
                                      <rect x="0" y="30" width="6" height="20" fill="none" stroke="#888" strokeWidth="0.5" />
                                      <rect x="114" y="30" width="6" height="20" fill="none" stroke="#888" strokeWidth="0.5" />
                                      {/* Penalty spots */}
                                      <circle cx="12" cy="40" r="0.8" fill="#888" />
                                      <circle cx="108" cy="40" r="0.8" fill="#888" />
                                      {/* Goal indicators */}
                                      <rect x="0" y="36" width="0.5" height="8" fill="#333" stroke="#333" strokeWidth="0.3" />
                                      <rect x="119.5" y="36" width="0.5" height="8" fill="#333" stroke="#333" strokeWidth="0.3" />
                                      
                                      {/* Plot box entries */}
                                      {(m.box_entry_locations[gamePhaseTeams.away] || []).map((entry, entryIdx) => (
                                        <g key={entryIdx}>
                                          <line
                                            x1={120 - entry.x1}
                                            y1={80 - entry.y1}
                                            x2={120 - entry.x2}
                                            y2={80 - entry.y2}
                                            stroke={entry.type === 'pass' ? '#2196F3' : '#FF9800'}
                                            strokeWidth="1.5"
                                            strokeDasharray={entry.type === 'pass' ? '2,2' : '0'}
                                            opacity="0.7"
                                          />
                                          <circle
                                            cx={120 - entry.x2}
                                            cy={80 - entry.y2}
                                            r="2"
                                            fill={entry.type === 'pass' ? '#2196F3' : '#FF9800'}
                                            stroke="black"
                                            strokeWidth="0.3"
                                            opacity="0.75"
                                          >
                                            <title>{entry.type === 'pass' ? 'Pass into box' : 'Carry into box'}</title>
                                          </circle>
                                        </g>
                                      ))}
                                    </svg>
                                  </div>
                                </div>
                                <div className={styles.shotMapLegend}>
                                  <span><span className={styles.legendLine} style={{backgroundColor: '#2196F3', borderStyle: 'dashed'}}></span> Pass into box</span>
                                  <span><span className={styles.legendLine} style={{backgroundColor: '#FF9800'}}></span> Carry into box</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
