import React, { useState, useEffect, Suspense, lazy } from "react";
import useMatchData from "../hooks/useMatchData";
import useUpload from "../hooks/useUpload";
import useVisualization from "../hooks/useVisualization";
import ErrorBanner from "../ErrorBanner";
// import FileUpload from "../FileUpload";
import MatchSelector from "../MatchSelector";
import Scoreboard from "../Scoreboard";
import CollapsibleSection from "../CollapsibleSection";
import GamePhaseCard, { reasonLabel } from "../GamePhaseCard";
import PlayerTable, { ATTACK_COLUMNS, CREATION_COLUMNS } from "../PlayerTable";
import SequenceMap from "../SequenceMap";
import TouchesMap from "../TouchesMap";
import { fetchEventContext, fetchNetwork } from "../hooks/matchApi";
// import ShotMapButtons from "../ShotMapButtons";
// import PassingNetworkButtons from "../PassingNetworkButtons";
import { PlotSkeleton } from "../LoadingSkeleton";
import { BACKEND_URL } from "../../config/api";
import { UI_SCALE } from "../../config/ui";
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
    loadPlayerTables,
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
  const [shotMapTeam, setShotMapTeam] = useState("both"); // "both" | "home" | "away"
  const [passNetTeam, setPassNetTeam] = useState("home"); // "home" | "away"
  const [showSubs, setShowSubs] = useState(false);
  const [playerTables, setPlayerTables] = useState({}); // team name -> { attack, creation, coverage }
  const [tablesLoading, setTablesLoading] = useState(false);
  // Click a shot: show what led to it, and the passing networks of the minute before (both teams)
  const [selectedShotId, setSelectedShotId] = useState(null);
  const [shotContext, setShotContext] = useState(null);
  const [leadNets, setLeadNets] = useState(null); // { [team]: figure | null }
  // Click a player in the passing network: show where they touched the ball
  const [touchesPlayer, setTouchesPlayer] = useState(null); // { team, player }
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

  // A new match starts on the default views
  useEffect(() => {
    setShotMapTeam("both");
    setPassNetTeam("home");
    setShowSubs(false);
  }, [selectedMatch]);

  // Shot map: reloads when the match or the team dropdown changes. The flag drops answers that
  // arrive after the user has already moved on, so a slow reply never replaces a newer chart.
  useEffect(() => {
    if (!canShoot) return undefined;
    let cancelled = false;
    setShotMapFigData(null);
    const request = shotMapTeam === "both"
      ? loadBothShotmaps(selectedMatch, homeName, awayName)
      : loadTeamShotmap(selectedMatch, shotMapTeam === "home" ? homeName : awayName);
    Promise.resolve(request).then(data => {
      if (!cancelled && data) setShotMapFigData(data);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMatch, homeName, awayName, canShoot, shotMapTeam]);

  // Player tables for both teams (one request each); the dropdowns only choose which to show
  useEffect(() => {
    if (!canShoot) return undefined;
    let cancelled = false;
    setPlayerTables({});
    setTablesLoading(true);
    Promise.all([homeName, awayName].map(t =>
      Promise.resolve(loadPlayerTables(selectedMatch, t)).then(d => [t, d]).catch(() => [t, null])
    )).then(pairs => {
      if (cancelled) return;
      setPlayerTables(Object.fromEntries(pairs.filter(([, d]) => d)));
      setTablesLoading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMatch, homeName, awayName, canShoot]);

  // A new match (or team) starts with nothing selected
  useEffect(() => {
    setSelectedShotId(null);
    setTouchesPlayer(null);
  }, [selectedMatch]);

  useEffect(() => { setTouchesPlayer(null); }, [passNetTeam, showSubs]);

  // Clicked shot: its lead-up, then the passing networks for the 60 seconds before it
  useEffect(() => {
    if (!selectedShotId) { setShotContext(null); setLeadNets(null); return undefined; }
    let cancelled = false;
    setShotContext(null);
    setLeadNets(null);
    fetchEventContext(selectedMatch, selectedShotId).then(ctx => {
      if (cancelled) return null;
      setShotContext(ctx);
      return Promise.all([homeName, awayName].map((t, i) =>
        fetchNetwork(selectedMatch, t, { flip: i === 1, window: ctx.network_window }).then(f => [t, f]).catch(() => [t, null])
      )).then(pairs => { if (!cancelled) setLeadNets(Object.fromEntries(pairs)); });
    }).catch(() => { if (!cancelled) setSelectedShotId(null); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShotId, selectedMatch]);

  // Passing network: the away team is drawn flipped so both teams attack the same way
  useEffect(() => {
    if (!canShoot) return undefined;
    let cancelled = false;
    setPassNetFigData(null);
    const team = passNetTeam === "home" ? homeName : awayName;
    Promise.resolve(loadPassingNetwork(selectedMatch, team, 1, passNetTeam === "away", showSubs)).then(data => {
      if (!cancelled && data) setPassNetFigData(data);
    }).catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMatch, homeName, awayName, canShoot, passNetTeam, showSubs]);

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
    <div className={styles.container} style={{ "--ui-scale": UI_SCALE }}>
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
            
            {/* Score card (left) and match facts (right) side by side */}
            <div className={styles.topRow}>
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
                </div>
                <div className={styles.vizHeaderTeamSection}>
                  <img 
                    src={`${BACKEND_URL}/team-logo/${encodeURIComponent(stats.away_team)}`} 
                    alt={stats.away_team}
                    className={styles.teamLogo}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <span className={styles.teamName}>{stats.away_team}</span>
                </div>
              </div>
              <div className={styles.vizHeaderMeta}>
                {stats.competition_stage && <span className={styles.vizHeaderStage}>{stats.competition_stage}</span>}
                {selectedLabel && stats.competition_stage && <span className={styles.vizHeaderSeparator}>|</span>}
                {selectedLabel && <span className={styles.vizHeaderDate}>{selectedLabel.match(/\d{4}-\d{2}-\d{2}/)?.[0] || ""}</span>}
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
              <div className={styles.matchFactsCard}>
                <h2 className={styles.matchFactsTitle}>Match facts</h2>
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
                    defErrors={(Number.isFinite(stats.home_def_errors) && Number.isFinite(stats.away_def_errors)) ? `${stats.home_def_errors} - ${stats.away_def_errors}` : "-"}
                    boxEntries={(Number.isFinite(stats.home_box_entries) && Number.isFinite(stats.away_box_entries)) ? `${stats.home_box_entries} - ${stats.away_box_entries}` : "-"}
                  />
              </div>
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

            {/* Shot map and passing network, side by side. Boxes keep their size while loading. */}
            <div className={styles.chartsRow}>
              <div className={styles.chartColumn}>
                <div className={styles.chartHeader}>
                  <h2 className={styles.chartTitle}>Shot Map</h2>
                  <select
                    className={styles.chartSelect}
                    value={shotMapTeam}
                    onChange={(e) => setShotMapTeam(e.target.value)}
                    disabled={!canShoot}
                    aria-label="Team for shot map"
                  >
                    <option value="both">Both teams</option>
                    <option value="home">{homeName}</option>
                    <option value="away">{awayName}</option>
                  </select>
                </div>
                <div className={styles.plotFrame}>
                  {shotMapFigData ? (
                    <Suspense fallback={<PlotSkeleton fill />}>
                      <ShotMapPlot
                        displayFig={shotMapFigData} flipSides={flipSides} plotLoading={plotLoading} fit hideTitle
                        onPointClick={pt => { if (typeof pt.customdata === "string") setSelectedShotId(pt.customdata); }}
                      />
                    </Suspense>
                  ) : (
                    <PlotSkeleton fill />
                  )}
                </div>
                {!selectedShotId && <p className={styles.chartNote}>Click a shot to see what led to it.</p>}
                {selectedShotId && (
                  <div style={{ marginTop: "12px" }}>
                    {shotContext
                      ? <SequenceMap context={shotContext} onClose={() => setSelectedShotId(null)} fill />
                      : <div className={`skeleton ${styles.plotFrame}`} aria-label="Loading lead-up" />}
                  </div>
                )}
                {(shotMapTeam === "both" ? [homeName, awayName] : [shotMapTeam === "home" ? homeName : awayName]).map(team => (
                  <PlayerTable
                    key={team}
                    title={`${team}: attacking involvement`}
                    columns={ATTACK_COLUMNS}
                    rows={playerTables[team]?.attack}
                    loading={tablesLoading}
                    note={playerTables[team]?.coverage?.receptions_with_360_pct != null
                      ? `Goal-side receptions use 360 tracking data, which covers ${playerTables[team].coverage.receptions_with_360_pct}% of this team's receptions. Hover a column title for the exact rule.`
                      : "Hover a column title for the exact rule."}
                  />
                ))}
              </div>
              <div className={styles.chartColumn}>
                <div className={styles.chartHeader}>
                  <h2 className={styles.chartTitle}>Passing Network</h2>
                  <select
                    className={styles.chartSelect}
                    value={passNetTeam}
                    onChange={(e) => setPassNetTeam(e.target.value)}
                    disabled={!canShoot}
                    aria-label="Team for passing network"
                  >
                    <option value="home">{homeName}</option>
                    <option value="away">{awayName}</option>
                  </select>
                </div>
                {selectedShotId ? (
                  <>
                    <div className={styles.leadBanner}>
                      <span>
                        The 60 seconds before {shotContext ? `${shotContext.event.player}'s ${shotContext.event.type.toLowerCase()} (${shotContext.event.minute}:${String(shotContext.event.second).padStart(2, "0")})` : "the shot"}, both teams
                      </span>
                      <button type="button" className={styles.chartSelect} onClick={() => setSelectedShotId(null)}>Back to the full match</button>
                    </div>
                    {[homeName, awayName].map(team => (
                      <div key={team}>
                        <div className={styles.leadTeam}>{team}</div>
                        <div className={styles.plotFrame}>
                          {!leadNets ? <PlotSkeleton fill /> : leadNets[team] ? (
                            <Suspense fallback={<PlotSkeleton fill />}>
                              <ShotMapPlot displayFig={leadNets[team]} flipSides={false} plotLoading={false} fit />
                            </Suspense>
                          ) : <div style={{ padding: "24px" }}>No completed passes in this window.</div>}
                        </div>
                      </div>
                    ))}
                  </>
                ) : touchesPlayer ? (
                  <TouchesMap
                    filename={selectedMatch} team={touchesPlayer.team} player={touchesPlayer.player}
                    onClose={() => setTouchesPlayer(null)}
                  />
                ) : (
                  <div className={styles.plotFrame}>
                    {passNetFigData ? (
                      <Suspense fallback={<PlotSkeleton fill />}>
                        <ShotMapPlot
                          displayFig={passNetFigData} flipSides={flipSides} plotLoading={plotLoading} fit
                          onPointClick={pt => {
                            const player = pt.customdata && pt.customdata[1] ? pt.customdata[1] : pt.text;
                            if (player && pt.data && pt.data.name === "players") {
                              setTouchesPlayer({ team: passNetTeam === "home" ? homeName : awayName, player });
                            }
                          }}
                        />
                      </Suspense>
                    ) : (
                      <PlotSkeleton fill />
                    )}
                  </div>
                )}
                <label className={styles.chartCheckLabel} title="Show each substitute in place of the player they replaced">
                  <input
                    type="checkbox"
                    checked={showSubs}
                    onChange={(e) => setShowSubs(e.target.checked)}
                    disabled={!canShoot}
                  />
                  Show substitutes in place of the players they replaced
                </label>
                <p className={styles.chartNote}>
                  Click a player to see where they touched the ball. Bubble size = number of touches.{showSubs ? " Hollow circles are substitutes (▲ = minute they came on)." : ""}
                </p>
                <PlayerTable
                  title={`${passNetTeam === "home" ? homeName : awayName}: chance creation`}
                  columns={CREATION_COLUMNS}
                  rows={playerTables[passNetTeam === "home" ? homeName : awayName]?.creation}
                  loading={tablesLoading}
                  note={playerTables[passNetTeam === "home" ? homeName : awayName]?.coverage?.forward_passes_with_360_pct != null
                    ? `Line-breaking passes use 360 tracking data, which covers ${playerTables[passNetTeam === "home" ? homeName : awayName].coverage.forward_passes_with_360_pct}% of this team's forward passes. Hover a column title for the exact rule.`
                    : "Hover a column title for the exact rule."}
                />
              </div>
            </div>

            <div className={styles.chartsDivider} />

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
                  {importantMomentsLoading && <div className={`skeleton ${styles.momentsSkeleton}`} aria-label="Loading moments" />}
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
                      {sceneError && sceneError}
                    </div>
                    {sceneLoading && !sceneImageBase64 && (
                      <div className={`skeleton ${styles.sceneSkeleton}`} aria-label="Loading scene" />
                    )}
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
                        <span className={styles.phaseTabName}>
                          {`${p.start_minute}:${String(p.start_second).padStart(2, "0")} - ${p.end_minute != null ? `${p.end_minute}:${String(p.end_second).padStart(2, "0")}` : "end"}`}
                        </span>
                        <span className={styles.phaseTabTime}>
                          {(Array.isArray(p.break_reasons) && p.break_reasons.length ? p.break_reasons.map(reasonLabel).join(", ") : "")}
                        </span>
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
              {gamePhaseLoading && <div className={`skeleton ${styles.gamePhasesSkeleton}`} aria-label="Loading phases" />}
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
                      <GamePhaseCard
                        key={ph.phase_idx}
                        filename={selectedMatch}
                        ph={ph}
                        m={m}
                        teams={gamePhaseTeams}
                        phaseMoments={phaseMoments}
                        scene={phaseScenes[ph.phase_idx]}
                        showScenes={phaseShowScenes[ph.phase_idx] ?? true}
                        onToggleScenes={on => setPhaseShowScenes(prev => ({ ...prev, [ph.phase_idx]: on }))}
                        onMomentClick={(momentIdx, moment) => handlePhaseMomentClick(ph.phase_idx, momentIdx, moment)}
                      />
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
