import React, { useState, useEffect, Suspense, lazy } from "react";
import useMatchData from "../hooks/useMatchData";
import useUpload from "../hooks/useUpload";
import useVisualization from "../hooks/useVisualization";
import ErrorBanner from "../ErrorBanner";
// import FileUpload from "../FileUpload";
import MatchSelector from "../MatchSelector";
import Scoreboard from "../Scoreboard";
import CollapsibleSection from "../CollapsibleSection";
// import ShotMapButtons from "../ShotMapButtons";
// import PassingNetworkButtons from "../PassingNetworkButtons";
import { PlotSkeleton } from "../LoadingSkeleton";
import { BACKEND_URL } from "../../config/api";
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
  const [showImportantScenes, setShowImportantScenes] = useState(true);
  const [gamePhases, setGamePhases] = useState([]);
  const [gamePhaseLoading, setGamePhaseLoading] = useState(false);
  const [gamePhaseError, setGamePhaseError] = useState(null);
  const [gamePhaseTeams, setGamePhaseTeams] = useState({ home: "", away: "" });
  const [gamePhaseMetrics, setGamePhaseMetrics] = useState([]);
  const [phaseScenes, setPhaseScenes] = useState({}); // {phaseIdx: {selectedMomentIdx, imageBase64, loading, error}}
  const [phaseShowScenes, setPhaseShowScenes] = useState({}); // {phaseIdx: boolean}
  const [selectedPhaseIdx, setSelectedPhaseIdx] = useState(0);

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
    setSelectedPhaseIdx(0);
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

  // Each new match starts with Show Scenes on, so its first key moment is selected
  useEffect(() => {
    setShowImportantScenes(true);
  }, [selectedMatch]);

  useEffect(() => {
    if (showImportantScenes && importantMoments.length > 0) {
      setSelectedMomentIdx(0);
    } else {
      setSelectedMomentIdx(null);
    }
  }, [importantMoments, selectedMatch, showImportantScenes]);

  // Auto-load Both Teams Shot Map when match is selected
  useEffect(() => {
    if (canShoot && selectedMatch && homeName && awayName) {
      loadBothShotmaps(selectedMatch, homeName, awayName).then(data => {
        if (data) setShotMapFigData(data);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMatch, homeName, awayName, canShoot]);

  // Auto-load Home Team Passing Network when match is selected
  useEffect(() => {
    if (canShoot && selectedMatch && homeName) {
      loadPassingNetwork(selectedMatch, homeName, 1, false).then(data => {
        if (data) setPassNetFigData(data);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMatch, homeName, canShoot]);

  const handleMomentClick = idx => {
    setSelectedMomentIdx(idx);
    setShowImportantScenes(true);
  };
  const handlePrev = () => setSelectedMomentIdx(idx => idx > 0 ? idx - 1 : 0);
  const handleNext = () => setSelectedMomentIdx(idx => idx < importantMoments.length - 1 ? idx + 1 : idx);
  const handleShowImportantScenesToggle = () => setShowImportantScenes(s => !s);
  
  // Handler for phase-specific key moments
  const handlePhaseMomentClick = (phaseIdx, momentIdx, moment) => {
    if (!moment || !moment.possession) return;
    
    setPhaseScenes(prev => ({
      ...prev,
      [phaseIdx]: {
        ...prev[phaseIdx],
        selectedMomentIdx: momentIdx,
        loading: true,
        error: null,
        imageBase64: null
      }
    }));
    
    fetch(`${BACKEND_URL}/match/${selectedMatch}/possession_scene?possession=${moment.possession}`)
      .then(res => res.json())
      .then(res => {
        if (res.image_base64) {
          setPhaseScenes(prev => ({
            ...prev,
            [phaseIdx]: {
              ...prev[phaseIdx],
              imageBase64: res.image_base64,
              loading: false
            }
          }));
        } else if (res.error) {
          setPhaseScenes(prev => ({
            ...prev,
            [phaseIdx]: {
              ...prev[phaseIdx],
              error: res.error,
              loading: false
            }
          }));
        }
      })
      .catch(() => {
        setPhaseScenes(prev => ({
          ...prev,
          [phaseIdx]: {
            ...prev[phaseIdx],
            error: "Failed to fetch scene",
            loading: false
          }
        }));
      });
  };

  // Goals, own goals and red cards in match order. Shown as "Key events" next to the score.
  const keyEvents = importantMoments
    .filter(moment => {
      return (moment.event_type === 'Shot' && moment.outcome === 'Goal') ||
                   moment.event_type === 'Own Goal For' ||
                   moment.event_type === 'Own Goal Against' ||
                   moment.event_type === 'Red Card';
          })
          .sort((a, b) => {
            const [aMin] = a.when ? a.when.split(':').map(Number) : [0];
            const [bMin] = b.when ? b.when.split(':').map(Number) : [0];
            return aMin - bMin;
          });

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

        {selectedMatch && (
          <>
            <div className={styles.sectionDivider}></div>
            
            <div className={styles.scoreCard}>
            {/* Score/Round/Date Header */}
            <div className={styles.visualizationHeader}>
              <div className={styles.vizHeaderContent}>
                <div className={styles.vizHeaderTeamSection}>
                  <img 
                    src={`${BACKEND_URL}/team-logo/${encodeURIComponent(stats.home_team)}`} 
                    alt={stats.home_team}
                    className={styles.teamLogo}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <span className={styles.teamName}>{stats.home_team}</span>
                </div>
                <div className={styles.vizHeaderScoreSection}>
                  <span className={styles.vizHeaderScore}>
                    {Number.isFinite(stats.home_score) && Number.isFinite(stats.away_score) ? `${stats.home_score} - ${stats.away_score}` : "0 - 0"}
              </span>
                  <div className={styles.vizHeaderMeta}>
                    {stats.competition_stage && <span className={styles.vizHeaderStage}>{stats.competition_stage}</span>}
                    {selectedLabel && stats.competition_stage && <span className={styles.vizHeaderSeparator}>|</span>}
                    {selectedLabel && <span className={styles.vizHeaderDate}>{selectedLabel.match(/\d{4}-\d{2}-\d{2}/)?.[0] || ""}</span>}
                  </div>
                </div>
                <div className={styles.vizHeaderTeamSection}>
                  <span className={styles.teamName}>{stats.away_team}</span>
                  <img 
                    src={`${BACKEND_URL}/team-logo/${encodeURIComponent(stats.away_team)}`} 
                    alt={stats.away_team}
                    className={styles.teamLogo}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              </div>
            </div>

            {/* ========================================
                MATCH TIMELINE - Sequential list of Goals, Red Cards, Own Goals
                ======================================== */}
            {importantMoments.length > 0 && (
              <div className={styles.keyEventsPanel}>
              <h2 className={styles.keyEventsTitle}>Key events</h2>
              <div className={styles.matchTimeline}>
                {keyEvents.length === 0 && (<div className={styles.keyEventsEmpty}>No goals or red cards in this match.</div>)}
                <div className={styles.timelineList}>
                  {keyEvents
                    .map((moment, idx) => {
                      const [min] = moment.when ? moment.when.split(':').map(Number) : [0];
                      
                      // Determine which team scored (own goals benefit the other team)
                      const isOwnGoal = moment.event_type === 'Own Goal For' || moment.event_type === 'Own Goal Against';
                      const isRedCard = moment.event_type === 'Red Card';
                      let displayTeam = moment.team;
                      
                      if (moment.event_type === 'Own Goal For') {
                        displayTeam = moment.team;
                      } else if (moment.event_type === 'Own Goal Against') {
                        displayTeam = moment.team === stats.home_team ? stats.away_team : stats.home_team;
                      }
                      
                      const isHomeTeam = displayTeam === stats.home_team;
                      
                      // Icon and color
                      let icon = '⚽';
                      let color = isOwnGoal ? '#FF9800' : '#4CAF50';
                      if (isRedCard) {
                        icon = '🟥';
                        color = '#D32F2F';
                      }
                      
                      // Get player last name
                      const playerName = moment.who || '';
                      const lastName = playerName.includes(' ') ? playerName.split(' ').pop() : playerName;
                      
                      return (
                        <div key={idx} className={styles.timelineRow}>
                          {/* Home team side */}
                          <div className={styles.timelineHomeCell}>
                            {isHomeTeam && (
                              <div className={styles.timelineEventContent}>
                                <span className={styles.timelinePlayerName}>{lastName}</span>
                                <div className={styles.timelineIcon} style={{ backgroundColor: color, borderRadius: isRedCard ? '3px' : '50%' }}>
                                  {icon}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Minute in center */}
                          <div className={styles.timelineMinuteCell}>
                            {min}'
                          </div>
                          
                          {/* Away team side */}
                          <div className={styles.timelineAwayCell}>
                            {!isHomeTeam && (
                              <div className={styles.timelineEventContent}>
                                <div className={styles.timelineIcon} style={{ backgroundColor: color, borderRadius: isRedCard ? '3px' : '50%' }}>
                                  {icon}
                                </div>
                                <span className={styles.timelinePlayerName}>{lastName}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
              </div>
)}
            </div>
            
            {/* Match facts: white numbers on a dark table */}
            <div className={styles.matchFactsBlock}>
              <h2 className={styles.matchFactsTitle}>Match facts</h2>
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
              <div className={styles.chartColumn}>
                <h2 className={styles.shotMapsTitle}>Shot Map</h2>
                {shotMapFigData && (
                  <div className={styles.shotMapPlot}>
                    <Suspense fallback={<PlotSkeleton />}>
                      <ShotMapPlot displayFig={shotMapFigData} flipSides={flipSides} plotLoading={plotLoading} fit />
                    </Suspense>
                  </div>
                )}
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
              </div>
              <div className={styles.chartColumn}>
                <h2 className={styles.passingNetworkTitle}>Passing Network</h2>
                {passNetFigData && (
                  <div className={styles.passingNetworkPlot}>
                    <Suspense fallback={<PlotSkeleton />}>
                      <ShotMapPlot displayFig={passNetFigData} flipSides={flipSides} plotLoading={plotLoading} fit />
                    </Suspense>
                  </div>
                )}
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
              </div>
            </div>
            
            
            {/* Key Moments Section */}
            <CollapsibleSection
              title="Key Moments"
              subtitle="Pick a moment in the table to see that possession."
              headerExtra={(
                <label className={styles.showScenesLabel}>
                  <input type="checkbox" checked={showImportantScenes} onChange={handleShowImportantScenesToggle} className={styles.showScenesCheckbox} />
                  Show Scenes
                </label>
              )}
            >
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
                          <th className={styles.tableHeaderCell}>Team</th>
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
                            <td className={styles.tableCell}>{m.team}</td>
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
            </CollapsibleSection>
            
            
            {/* Game Phases Section */}
            <CollapsibleSection title="Game Phases" subtitle="One phase at a time. Pick a phase below.">
              {!gamePhaseLoading && !gamePhaseError && gamePhases.length > 0 && (
                <div className={styles.phasePicker}>
                  <button
                    type="button"
                    className={styles.phaseNavButton}
                    onClick={() => setSelectedPhaseIdx(i => Math.max(0, i - 1))}
                    disabled={selectedPhaseIdx <= 0}
                    aria-label="Previous phase"
                  >{"←"}</button>
                  <div className={styles.phaseTabs} role="tablist" aria-label="Game phases">
                    {gamePhases.map((p, i) => (
                      <button
                        key={p.phase_idx}
                        type="button"
                        role="tab"
                        aria-selected={i === selectedPhaseIdx}
                        className={i === selectedPhaseIdx ? styles.phaseTabActive : styles.phaseTab}
                        onClick={() => setSelectedPhaseIdx(i)}
                      >
                        <span className={styles.phaseTabName}>Phase {p.phase_idx}</span>
                        <span className={styles.phaseTabTime}>{`${p.start_minute}:${String(p.start_second).padStart(2, "0")}`}</span>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={styles.phaseNavButton}
                    onClick={() => setSelectedPhaseIdx(i => Math.min(gamePhases.length - 1, i + 1))}
                    disabled={selectedPhaseIdx >= gamePhases.length - 1}
                    aria-label="Next phase"
                  >{"→"}</button>
                </div>
              )}
              {gamePhaseLoading && <div className={styles.gamePhasesLoading}>Loading phases...</div>}
              {gamePhaseError && <div className={styles.gamePhasesError}>{gamePhaseError}</div>}
              {!gamePhaseLoading && !gamePhaseError && gamePhases.length === 0 && (
                <div className={styles.gamePhasesEmpty}>
                  No phases detected for match.
                </div>
              )}
              {!gamePhaseLoading && !gamePhaseError && gamePhases.length > 0 && (
                <div className={styles.gamePhasesList}>
                  {gamePhases.filter((_, i) => i === selectedPhaseIdx).map(ph => {
                    const m = (gamePhaseMetrics || []).find(mm => mm.phase_idx === ph.phase_idx);
                    
                    // Filter key moments for this phase (check period AND time, exclude phase-starting goal)
                    const phaseMoments = importantMoments.filter(moment => {
                      if (!moment.when) return false;
                      
                      // Check period matches (handle null/undefined)
                      const momentPeriod = moment.period;
                      const phasePeriod = ph.start_period;
                      
                      // If both have period values, they must match
                      if (momentPeriod !== null && momentPeriod !== undefined && 
                          phasePeriod !== null && phasePeriod !== undefined) {
                        if (momentPeriod !== phasePeriod) return false;
                      }
                      
                      // Check time range within same period
                      const [min, sec] = moment.when.split(':').map(Number);
                      const startMin = ph.start_minute;
                      const startSec = ph.start_second;
                      const endMin = ph.end_minute !== null ? ph.end_minute : 999;
                      const endSec = ph.end_minute !== null ? ph.end_second : 999;
                      
                      const momentTime = min * 60 + sec;
                      const startTime = startMin * 60 + startSec;
                      const endTime = endMin * 60 + endSec;
                      
                      // Strict range: start_time < moment_time <= end_time
                      // This excludes any moment AT the start time (which ended the previous phase)
                      if (momentTime <= startTime || momentTime > endTime) return false;
                      
                      return true;
                    });
                    
                    return (
                    <div key={ph.phase_idx} className={styles.gamePhaseCard}>
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
                        <>
                          {/* Stats table and Substitutions at top */}
                          <div className={styles.phaseStatsTopContainer}>
                            <div className={styles.phaseStatsAndSubsLayout}>
                              {/* Stats table */}
                              <div className={styles.metricsContainer}>
                                <h3 className={styles.phaseStatsTitle}>Phase Stats</h3>
                                <table className={styles.phaseMetricsTable}>
                              <thead>
                                <tr>
                                  <th className={styles.phaseMetricsHeaderCell}></th>
                                  <th className={styles.phaseMetricsHeaderCell}>{gamePhaseTeams.home}</th>
                                  <th className={styles.phaseMetricsHeaderCell}>{gamePhaseTeams.away}</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className={styles.phaseMetricsRow}>
                                  <td className={styles.phaseMetricsLabelCell}>Shots (On Target)</td>
                                  <td className={styles.phaseMetricsValueCell}>{m.shots_summary?.[gamePhaseTeams.home]?.total ?? 0} ({m.shots_summary?.[gamePhaseTeams.home]?.on_target ?? 0})</td>
                                  <td className={styles.phaseMetricsValueCell}>{m.shots_summary?.[gamePhaseTeams.away]?.total ?? 0} ({m.shots_summary?.[gamePhaseTeams.away]?.on_target ?? 0})</td>
                                </tr>
                                <tr className={styles.phaseMetricsRow}>
                                  <td className={styles.phaseMetricsLabelCell}>Chances (All/Big)</td>
                                  <td className={styles.phaseMetricsValueCell}>{m.chances?.[gamePhaseTeams.home]?.ok ?? 0} / {m.chances?.[gamePhaseTeams.home]?.good ?? 0}</td>
                                  <td className={styles.phaseMetricsValueCell}>{m.chances?.[gamePhaseTeams.away]?.ok ?? 0} / {m.chances?.[gamePhaseTeams.away]?.good ?? 0}</td>
                                </tr>
                                <tr className={styles.phaseMetricsRow}>
                                  <td className={styles.phaseMetricsLabelCell}>Final Third Entries</td>
                                  <td className={styles.phaseMetricsValueCell}>{m.final_third_entries?.[gamePhaseTeams.home] ?? 0}</td>
                                  <td className={styles.phaseMetricsValueCell}>{m.final_third_entries?.[gamePhaseTeams.away] ?? 0}</td>
                                </tr>
                                <tr className={styles.phaseMetricsRow}>
                                  <td className={styles.phaseMetricsLabelCell}>Box Entries</td>
                                  <td className={styles.phaseMetricsValueCell}>{m.box_entries?.[gamePhaseTeams.home] ?? 0}</td>
                                  <td className={styles.phaseMetricsValueCell}>{m.box_entries?.[gamePhaseTeams.away] ?? 0}</td>
                                </tr>
                                <tr className={styles.phaseMetricsRow}>
                                  <td className={styles.phaseMetricsLabelCell}>Possession %</td>
                                  <td className={styles.phaseMetricsValueCell}>{m.possession_pct_by_passes?.[gamePhaseTeams.home] ?? 0}%</td>
                                  <td className={styles.phaseMetricsValueCell}>{m.possession_pct_by_passes?.[gamePhaseTeams.away] ?? 0}%</td>
                                </tr>
                                <tr className={styles.phaseMetricsRow}>
                                  <td className={styles.phaseMetricsLabelCell}>Goals</td>
                                  <td className={styles.phaseMetricsValueCell}>{m.goals?.[gamePhaseTeams.home] ?? 0}</td>
                                  <td className={styles.phaseMetricsValueCell}>{m.goals?.[gamePhaseTeams.away] ?? 0}</td>
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
                                  <td className={styles.phaseMetricsLabelCell}>Penalties</td>
                                  <td className={styles.phaseMetricsValueCell}>{m.penalties?.[gamePhaseTeams.home] ?? 0}</td>
                                  <td className={styles.phaseMetricsValueCell}>{m.penalties?.[gamePhaseTeams.away] ?? 0}</td>
                                </tr>
                              </tbody>
                            </table>
                              </div>
                              
                              {/* Substitutions table - always show if substitutions data exists */}
                              {m.substitutions && (
                                <div className={styles.phaseSubstitutionsContainer}>
                                  <h3 className={styles.phaseSubstitutionsTitle}>Substitutions</h3>
                                  <div className={styles.phaseSubstitutionsGrid}>
                                    {/* Home team substitutions */}
                                    <div className={styles.phaseSubstitutionsTeamColumn}>
                                      <div className={styles.phaseSubstitutionsTeamLabel}>{gamePhaseTeams.home}</div>
                                      {Array.isArray(m.substitutions[gamePhaseTeams.home]) && m.substitutions[gamePhaseTeams.home].length > 0 ? (
                                        <table className={styles.phaseSubstitutionsTable}>
                                          <thead>
                                            <tr>
                                              <th className={styles.phaseSubstitutionsHeaderCell}>Time</th>
                                              <th className={styles.phaseSubstitutionsHeaderCell}>Off</th>
                                              <th className={styles.phaseSubstitutionsHeaderCell}>Position</th>
                                              <th className={styles.phaseSubstitutionsHeaderCell}>On</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {m.substitutions[gamePhaseTeams.home].map((sub, subIdx) => (
                                              <tr key={subIdx} className={styles.phaseSubstitutionsRow}>
                                                <td className={styles.phaseSubstitutionsCell}>
                                                  {sub.minute}:{String(sub.second).padStart(2, '0')}
                                                </td>
                                                <td className={styles.phaseSubstitutionsCell}>{sub.player_off || '—'}</td>
                                                <td className={styles.phaseSubstitutionsCell}>{sub.position_off || '—'}</td>
                                                <td className={styles.phaseSubstitutionsCell}>{sub.player_on || '—'}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      ) : (
                                        <div className={styles.noSubstitutionsPlaceholder}>No substitutions</div>
                                      )}
                                    </div>
                                    
                                    {/* Away team substitutions */}
                                    <div className={styles.phaseSubstitutionsTeamColumn}>
                                      <div className={styles.phaseSubstitutionsTeamLabel}>{gamePhaseTeams.away}</div>
                                      {Array.isArray(m.substitutions[gamePhaseTeams.away]) && m.substitutions[gamePhaseTeams.away].length > 0 ? (
                                        <table className={styles.phaseSubstitutionsTable}>
                                          <thead>
                                            <tr>
                                              <th className={styles.phaseSubstitutionsHeaderCell}>Time</th>
                                              <th className={styles.phaseSubstitutionsHeaderCell}>Off</th>
                                              <th className={styles.phaseSubstitutionsHeaderCell}>Position</th>
                                              <th className={styles.phaseSubstitutionsHeaderCell}>On</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {m.substitutions[gamePhaseTeams.away].map((sub, subIdx) => (
                                              <tr key={subIdx} className={styles.phaseSubstitutionsRow}>
                                                <td className={styles.phaseSubstitutionsCell}>
                                                  {sub.minute}:{String(sub.second).padStart(2, '0')}
                                                </td>
                                                <td className={styles.phaseSubstitutionsCell}>{sub.player_off || '—'}</td>
                                                <td className={styles.phaseSubstitutionsCell}>{sub.position_off || '—'}</td>
                                                <td className={styles.phaseSubstitutionsCell}>{sub.player_on || '—'}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      ) : (
                                        <div className={styles.noSubstitutionsPlaceholder}>No substitutions</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Divider line */}
                          <div className={styles.phaseDivider}></div>
                          
                          {/* Three-column layout below divider: Left=Passing Networks, Middle=Key Events/Box Entry, Right=Key Moments */}
                          <div className={styles.phaseThreeColumnLayout}>
                            {/* LEFT: Passing Networks */}
                            <div className={styles.phasePassingNetworksColumn}>
                              {m.passing_networks && (
                                <div className={styles.phasePassingNetworksContainer}>
                                  <h3 className={styles.phaseVisualizationTitle}>Passing Networks</h3>
                                  <div className={styles.phasePassingNetworksStack}>
                                    <div className={styles.phasePassingNetworkCard}>
                                      <div className={styles.shotMapTeamLabel}>{gamePhaseTeams.home}</div>
                                      <div className={styles.phasePassingNetworkPlot}>
                                        <Suspense fallback={<PlotSkeleton />}>
                                          <ShotMapPlot 
                                            displayFig={m.passing_networks[gamePhaseTeams.home] || null} 
                                            flipSides={false} 
                                            plotLoading={false} 
                                            customSize={{ width: 900, height: 600 }} 
                                          />
                                        </Suspense>
                                      </div>
                                    </div>
                                    <div className={styles.phasePassingNetworkCard}>
                                      <div className={styles.shotMapTeamLabel}>{gamePhaseTeams.away}</div>
                                      <div className={styles.phasePassingNetworkPlot}>
                                        <Suspense fallback={<PlotSkeleton />}>
                                          <ShotMapPlot 
                                            displayFig={m.passing_networks[gamePhaseTeams.away] || null} 
                                            flipSides={true} 
                                            plotLoading={false} 
                                            customSize={{ width: 900, height: 600 }} 
                                          />
                                        </Suspense>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* MIDDLE: Key Events and Box Entry Maps */}
                            <div className={styles.phaseVisualizationsColumn}>
                              {/* Key Events (shots, red cards, own goals) */}
                              {m.shot_map_data && (
                                <div className={styles.shotMapsContainer}>
                                <h3 className={styles.phaseVisualizationTitle}>Key Events (shots, red cards, own goals)</h3>
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
                                          const outcome = event.outcome.toLowerCase();
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
                                              
                                              {(outcome === 'woodwork' || outcome === 'post' || outcome === 'saved to post') && (
                                                <>
                                                  <line x1={event.x - 2} y1={80 - event.y - 2} x2={event.x + 2} y2={80 - event.y + 2} stroke="white" strokeWidth="2" />
                                                  <line x1={event.x - 2} y1={80 - event.y + 2} x2={event.x + 2} y2={80 - event.y - 2} stroke="white" strokeWidth="2" />
                                                  <line x1={event.x - 2} y1={80 - event.y - 2} x2={event.x + 2} y2={80 - event.y + 2} stroke="black" strokeWidth="0.5" />
                                                  <line x1={event.x - 2} y1={80 - event.y + 2} x2={event.x + 2} y2={80 - event.y - 2} stroke="black" strokeWidth="0.5" />
                                                </>
                                              )}
                                              
                                              {outcome === 'saved' && (
                                                <circle cx={event.x} cy={80 - event.y} r="3.5" fill="none" stroke="red" strokeWidth="1.2" />
                                              )}
                                              
                                              {outcome === 'blocked' && (
                                                <>
                                                  <line x1={event.x - 2} y1={80 - event.y - 2} x2={event.x + 2} y2={80 - event.y + 2} stroke="red" strokeWidth="1" />
                                                  <line x1={event.x - 2} y1={80 - event.y + 2} x2={event.x + 2} y2={80 - event.y - 2} stroke="red" strokeWidth="1" />
                                                </>
                                              )}
                                              
                                              {outcome === 'wayward' && (
                                                <text x={event.x} y={80 - event.y + 1.5} textAnchor="middle" fontSize="5" fill="purple" fontWeight="bold">?</text>
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
                                          const outcome = event.outcome.toLowerCase();
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
                                              
                                              {(outcome === 'woodwork' || outcome === 'post' || outcome === 'saved to post') && (
                                                <>
                                                  <line x1={event.x - 2} y1={80 - event.y - 2} x2={event.x + 2} y2={80 - event.y + 2} stroke="white" strokeWidth="2" />
                                                  <line x1={event.x - 2} y1={80 - event.y + 2} x2={event.x + 2} y2={80 - event.y - 2} stroke="white" strokeWidth="2" />
                                                  <line x1={event.x - 2} y1={80 - event.y - 2} x2={event.x + 2} y2={80 - event.y + 2} stroke="black" strokeWidth="0.5" />
                                                  <line x1={event.x - 2} y1={80 - event.y + 2} x2={event.x + 2} y2={80 - event.y - 2} stroke="black" strokeWidth="0.5" />
                                                </>
                                              )}
                                              
                                              {outcome === 'saved' && (
                                                <circle cx={event.x} cy={80 - event.y} r="3.5" fill="none" stroke="red" strokeWidth="1.2" />
                                              )}
                                              
                                              {outcome === 'blocked' && (
                                                <>
                                                  <line x1={event.x - 2} y1={80 - event.y - 2} x2={event.x + 2} y2={80 - event.y + 2} stroke="red" strokeWidth="1" />
                                                  <line x1={event.x - 2} y1={80 - event.y + 2} x2={event.x + 2} y2={80 - event.y - 2} stroke="red" strokeWidth="1" />
                                                </>
                                              )}
                                              
                                              {outcome === 'wayward' && (
                                                <text x={event.x} y={80 - event.y + 1.5} textAnchor="middle" fontSize="5" fill="purple" fontWeight="bold">?</text>
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
                                  <span><span className={styles.legendDot} style={{backgroundColor: 'orange'}}></span> Normal xG (0.08-0.27)</span>
                                  <span><span className={styles.legendDot} style={{backgroundColor: 'black'}}></span> Low xG (&lt;0.08)</span>
                                  <span><span className={styles.legendSquare}></span> Red Card</span>
                                  <span><span className={styles.legendX}></span> Own Goal For</span>
                                </div>
                                <div className={styles.shotOutcomeLegend}>
                                  <span><span className={styles.legendWhiteX}></span> Woodwork/Post/Saved to Post</span>
                                  <span><span className={styles.legendRedCircle}></span> Saved</span>
                                  <span><span className={styles.legendRedX}></span> Blocked</span>
                                  <span><span className={styles.legendQuestion}></span> Wayward</span>
                                </div>
                              </div>
                            )}
                            
                            {/* Box Entry Maps for each team */}
                            {m.box_entry_locations && (
                              <div className={styles.shotMapsContainer}>
                                <h3 className={styles.phaseVisualizationTitle}>Box Entry Maps</h3>
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
                                      {(m.box_entry_locations[gamePhaseTeams.home] || []).map((entry, entryIdx) => {
                                        const defaultColor = entry.type === 'pass' ? '#2196F3' : '#FF9800';
                                        const strokeColor = entry.color || defaultColor;
                                        const fillColor = entry.color || defaultColor;
                                        return (
                                        <g key={entryIdx}>
                                          <line
                                            x1={entry.x1}
                                            y1={80 - entry.y1}
                                            x2={entry.x2}
                                            y2={80 - entry.y2}
                                            stroke={strokeColor}
                                            strokeWidth="1.5"
                                            strokeDasharray={entry.type === 'pass' ? '2,2' : '0'}
                                            opacity="0.7"
                                          />
                                          <circle
                                            cx={entry.x2}
                                            cy={80 - entry.y2}
                                            r="2"
                                            fill={fillColor}
                                            stroke="black"
                                            strokeWidth="0.3"
                                            opacity="0.75"
                                          >
                                            <title>{entry.type === 'pass' ? 'Pass into box' : 'Carry into box'}</title>
                                          </circle>
                                        </g>
                                        );
                                      })}
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
                                      {(m.box_entry_locations[gamePhaseTeams.away] || []).map((entry, entryIdx) => {
                                        const defaultColor = entry.type === 'pass' ? '#2196F3' : '#FF9800';
                                        const strokeColor = entry.color || defaultColor;
                                        const fillColor = entry.color || defaultColor;
                                        return (
                                        <g key={entryIdx}>
                                          <line
                                            x1={entry.x1}
                                            y1={80 - entry.y1}
                                            x2={entry.x2}
                                            y2={80 - entry.y2}
                                            stroke={strokeColor}
                                            strokeWidth="1.5"
                                            strokeDasharray={entry.type === 'pass' ? '2,2' : '0'}
                                            opacity="0.7"
                                          />
                                          <circle
                                            cx={entry.x2}
                                            cy={80 - entry.y2}
                                            r="2"
                                            fill={fillColor}
                                            stroke="black"
                                            strokeWidth="0.3"
                                            opacity="0.75"
                                          >
                                            <title>{entry.type === 'pass' ? 'Pass into box' : 'Carry into box'}</title>
                                          </circle>
                                        </g>
                                        );
                                      })}
                                    </svg>
                                  </div>
                                </div>
                                <div className={styles.shotMapLegend}>
                                  <span><span className={styles.legendLine} style={{backgroundColor: '#2196F3', borderStyle: 'dashed'}}></span> Pass into box</span>
                                  <span><span className={styles.legendLine} style={{backgroundColor: '#FF9800'}}></span> Carry into box</span>
                                </div>
                                <div className={styles.shotOutcomeLegend}>
                                  <span><span className={styles.legendDot} style={{backgroundColor: '#00C853'}}></span> → Goal</span>
                                  <span><span className={styles.legendDot} style={{backgroundColor: '#69F0AE'}}></span> → Own Goal</span>
                                  <span><span className={styles.legendDot} style={{backgroundColor: '#FFF59D'}}></span> → Shot</span>
                                </div>
                              </div>
                            )}
                            </div>
                            
                            {/* RIGHT: Key Moments */}
                            <div className={styles.phaseMomentsColumn}>
                          <h3 className={styles.phaseMomentsTitle}>
                            Key Moments
                            {phaseMoments.length > 0 && (
                              <label className={styles.showScenesLabel}>
                                <input 
                                  type="checkbox" 
                                  checked={phaseShowScenes[ph.phase_idx] || false}
                                  onChange={(e) => {
                                    setPhaseShowScenes(prev => ({...prev, [ph.phase_idx]: e.target.checked}));
                                    if (e.target.checked && phaseMoments.length > 0) {
                                      handlePhaseMomentClick(ph.phase_idx, 0, phaseMoments[0]);
                                    }
                                  }}
                                  className={styles.showScenesCheckbox}
                                />
                                Show Scenes
                              </label>
                            )}
                          </h3>
                          {phaseMoments.length === 0 ? (
                            <div className={styles.noMomentsPlaceholder}>No key moments in this phase</div>
                          ) : (
                            <>
                              <table className={styles.phaseMomentsTable}>
                                <thead>
                                  <tr className={styles.tableHeader}>
                                    <th className={styles.phaseMomentsHeaderCell}>When</th>
                                    <th className={styles.phaseMomentsHeaderCell}>Team</th>
                                    <th className={styles.phaseMomentsHeaderCell}>Who</th>
                                    <th className={styles.phaseMomentsHeaderCell}>Type</th>
                                    <th className={styles.phaseMomentsHeaderCell}>xG</th>
                                    <th className={styles.phaseMomentsHeaderCell}>Outcome</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {phaseMoments.map((moment, mIdx) => {
                                    const phaseScene = phaseScenes[ph.phase_idx];
                                    const isSelected = phaseShowScenes[ph.phase_idx] && phaseScene?.selectedMomentIdx === mIdx;
                                    return (
                                      <tr 
                                        key={mIdx} 
                                        className={isSelected ? styles.phaseMomentsRowSelected : styles.phaseMomentsRow}
                                        onClick={() => handlePhaseMomentClick(ph.phase_idx, mIdx, moment)}
                                        style={{cursor: 'pointer'}}
                                      >
                                        <td className={styles.phaseMomentsCell}>{moment.when}</td>
                                        <td className={styles.phaseMomentsCell}>{moment.team}</td>
                                        <td className={styles.phaseMomentsCell}>{moment.who}</td>
                                        <td className={styles.phaseMomentsCell}>{moment.event_type}</td>
                                        <td className={styles.phaseMomentsCell}>{moment.xg !== undefined && moment.xg !== null ? moment.xg : ''}</td>
                                        <td className={styles.phaseMomentsCell}>{moment.outcome}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                              
                              {/* Scene Viewer for this phase */}
                              {phaseShowScenes[ph.phase_idx] && phaseScenes[ph.phase_idx] && (
                                <div className={styles.phaseSceneViewer}>
                                  {phaseScenes[ph.phase_idx].loading && <div>Loading scene...</div>}
                                  {phaseScenes[ph.phase_idx].error && <div className={styles.errorText}>{phaseScenes[ph.phase_idx].error}</div>}
                                  {phaseScenes[ph.phase_idx].imageBase64 && (
                                    <img
                                      src={`data:image/png;base64,${phaseScenes[ph.phase_idx].imageBase64}`}
                                      alt="Phase Possession Scene"
                                      className={styles.phaseSceneImage}
                                    />
                                  )}
                    </div>
                              )}
                            </>
                          )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </CollapsibleSection>
          </>
        )}
      </div>
    </div>
  );
}
