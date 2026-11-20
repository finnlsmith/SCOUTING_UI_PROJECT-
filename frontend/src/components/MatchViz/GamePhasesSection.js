import React, { useState, useEffect, Suspense, lazy } from "react";
import CollapsibleSection from "../CollapsibleSection";
import { PlotSkeleton } from "../LoadingSkeleton";
import { BACKEND_URL } from "../../config/api";
import { fetchPossessionScene } from "./possessionScene";
import { momentsInPhase, formatClock } from "./phaseMoments";
import { PhaseKeyEventsMap, PhaseBoxEntryMaps } from "./PitchMaps";
import SubstitutionsTable from "./SubstitutionsTable";
import styles from "./MatchViz.module.css";

const ShotMapPlot = lazy(() => import("../ShotMapPlot"));

// [label, value for one team]
const metricRows = (m, team) => [
  ["Shots (On Target)", `${m.shots_summary?.[team]?.total ?? 0} (${m.shots_summary?.[team]?.on_target ?? 0})`],
  ["Chances (All/Big)", `${m.chances?.[team]?.ok ?? 0} / ${m.chances?.[team]?.good ?? 0}`],
  ["Final Third Entries", m.final_third_entries?.[team] ?? 0],
  ["Box Entries", m.box_entries?.[team] ?? 0],
  ["Possession %", `${m.possession_pct_by_passes?.[team] ?? 0}%`],
  ["Goals", m.goals?.[team] ?? 0],
  ["Fouls", m.fouls?.[team] ?? 0],
  ["Cards (Yellow / Red)", `${m.cards?.[team]?.yellow ?? 0} / ${m.cards?.[team]?.red ?? 0}`],
  ["Penalties", m.penalties?.[team] ?? 0],
];

function PhaseStatsTable({ teams, metrics }) {
  const homeRows = metricRows(metrics, teams.home);
  const awayRows = metricRows(metrics, teams.away);
  return (
    <div className={styles.metricsContainer}>
      <h3 className={styles.phaseStatsTitle}>Phase Stats</h3>
      <table className={styles.phaseMetricsTable}>
        <thead>
          <tr>
            <th className={styles.phaseMetricsHeaderCell}></th>
            <th className={styles.phaseMetricsHeaderCell}>{teams.home}</th>
            <th className={styles.phaseMetricsHeaderCell}>{teams.away}</th>
          </tr>
        </thead>
        <tbody>
          {homeRows.map(([label, home], i) => (
            <tr key={label} className={styles.phaseMetricsRow}>
              <td className={styles.phaseMetricsLabelCell}>{label}</td>
              <td className={styles.phaseMetricsValueCell}>{home}</td>
              <td className={styles.phaseMetricsValueCell}>{awayRows[i][1]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PhasePassingNetworks({ teams, networks }) {
  return (
    <div className={styles.phasePassingNetworksContainer}>
      <h3 className={styles.phaseVisualizationTitle}>Passing Networks</h3>
      <div className={styles.phasePassingNetworksStack}>
        {[[teams.home, false], [teams.away, true]].map(([team, flipSides]) => (
          <div key={team} className={styles.phasePassingNetworkCard}>
            <div className={styles.shotMapTeamLabel}>{team}</div>
            <div className={styles.phasePassingNetworkPlot}>
              <Suspense fallback={<PlotSkeleton />}>
                <ShotMapPlot
                  displayFig={networks[team] || null}
                  flipSides={flipSides}
                  plotLoading={false}
                  customSize={{ width: 900, height: 600 }}
                />
              </Suspense>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Key moments inside one phase, with an optional scene viewer. */
function PhaseMoments({ matchFile, phase, moments }) {
  const [showScenes, setShowScenes] = useState(false);
  const [scene, setScene] = useState(null); // { selectedIdx, loading, error, image }

  const selectMoment = async (idx, moment) => {
    if (!moment || !moment.possession) return;
    setScene({ selectedIdx: idx, loading: true, error: null, image: null });
    const result = await fetchPossessionScene(matchFile, moment.possession);
    // Ignore a late reply if a different moment was picked meanwhile
    setScene(prev => (prev && prev.selectedIdx === idx
      ? { ...prev, loading: false, image: result.image || null, error: result.error || null }
      : prev));
  };

  return (
    <div className={styles.phaseMomentsColumn}>
      <h3 className={styles.phaseMomentsTitle}>
        Key Moments
        {moments.length > 0 && (
          <label className={styles.showScenesLabel}>
            <input
              type="checkbox"
              checked={showScenes}
              onChange={e => {
                setShowScenes(e.target.checked);
                if (e.target.checked) selectMoment(0, moments[0]);
              }}
              className={styles.showScenesCheckbox}
            />
            Show Scenes
          </label>
        )}
      </h3>
      {moments.length === 0 ? (
        <div className={styles.noMomentsPlaceholder}>No key moments in this phase</div>
      ) : (
        <>
          <table className={styles.phaseMomentsTable}>
            <thead>
              <tr className={styles.tableHeader}>
                {["When", "Team", "Who", "Type", "xG", "Outcome"].map(h => (
                  <th key={h} className={styles.phaseMomentsHeaderCell}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {moments.map((moment, idx) => {
                const isSelected = showScenes && scene?.selectedIdx === idx;
                return (
                  <tr
                    key={idx}
                    className={isSelected ? styles.phaseMomentsRowSelected : styles.phaseMomentsRow}
                    onClick={() => selectMoment(idx, moment)}
                    style={{ cursor: "pointer" }}
                  >
                    <td className={styles.phaseMomentsCell}>{moment.when}</td>
                    <td className={styles.phaseMomentsCell}>{moment.team}</td>
                    <td className={styles.phaseMomentsCell}>{moment.who}</td>
                    <td className={styles.phaseMomentsCell}>{moment.event_type}</td>
                    <td className={styles.phaseMomentsCell}>{moment.xg !== undefined && moment.xg !== null ? moment.xg : ""}</td>
                    <td className={styles.phaseMomentsCell}>{moment.outcome}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {showScenes && scene && (
            <div className={styles.phaseSceneViewer}>
              {scene.loading && <div>Loading scene...</div>}
              {scene.error && <div className={styles.errorText}>{scene.error}</div>}
              {scene.image && (
                <img
                  src={`data:image/png;base64,${scene.image}`}
                  alt="Phase Possession Scene"
                  className={styles.phaseSceneImage}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PhaseCard({ matchFile, phase, metrics, teams, importantMoments }) {
  return (
    <div className={styles.gamePhaseCard}>
      <div className={styles.gamePhaseHeader}>
        <div className={styles.gamePhaseTitle}>Game Phase {phase.phase_idx}</div>
        <div className={styles.gamePhaseTime}>
          <b>From: </b>{formatClock(phase.start_minute, phase.start_second)} <b>— To: </b>
          {phase.end_minute !== null ? formatClock(phase.end_minute, phase.end_second) : "End"}
        </div>
        <div className={styles.gamePhaseScore}>
          <b>Score: </b>{teams.home} {phase.score_start} {teams.away}
          {phase.score_end ? ` → ${phase.score_end}` : ""}
        </div>
        {phase.goal_info && phase.goal_info.scorer && (
          <div className={styles.gamePhaseGoalInfo}>
            Goal Event: <b>{phase.goal_info.event_type}</b>
            {phase.goal_info.own_goal_team ? ` (Own goal by ${phase.goal_info.own_goal_team})` : ""}, scored by <b>{phase.goal_info.scorer}</b>
          </div>
        )}
        {Array.isArray(phase.break_reasons) && phase.break_reasons.length > 0 && (
          <div className={styles.gamePhaseBreakReasons}>
            Phase ended by: {phase.break_reasons.map(r => (r === "half_end" ? "Half Ended" : r)).join(", ")}
          </div>
        )}
      </div>

      {metrics && (
        <>
          <div className={styles.phaseStatsTopContainer}>
            <div className={styles.phaseStatsAndSubsLayout}>
              <PhaseStatsTable teams={teams} metrics={metrics} />
              {metrics.substitutions && (
                <SubstitutionsTable teams={teams} substitutions={metrics.substitutions} />
              )}
            </div>
          </div>

          <div className={styles.phaseDivider}></div>

          {/* Left: passing networks. Middle: key events and box entries. Right: key moments. */}
          <div className={styles.phaseThreeColumnLayout}>
            <div className={styles.phasePassingNetworksColumn}>
              {metrics.passing_networks && (
                <PhasePassingNetworks teams={teams} networks={metrics.passing_networks} />
              )}
            </div>

            <div className={styles.phaseVisualizationsColumn}>
              {metrics.shot_map_data && <PhaseKeyEventsMap teams={teams} shotMapData={metrics.shot_map_data} />}
              {metrics.box_entry_locations && (
                <PhaseBoxEntryMaps teams={teams} boxEntryLocations={metrics.box_entry_locations} />
              )}
            </div>

            <PhaseMoments
              // reset the scene viewer when the phase or match changes
              key={`${matchFile}-${phase.phase_idx}`}
              matchFile={matchFile}
              phase={phase}
              moments={momentsInPhase(importantMoments, phase)}
            />
          </div>
        </>
      )}
    </div>
  );
}

/** Game phases for the selected match, one phase at a time. */
export default function GamePhasesSection({ matchFile, importantMoments }) {
  const [phases, setPhases] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [teams, setTeams] = useState({ home: "", away: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    if (!matchFile) {
      setPhases([]); setError(null); setTeams({ home: "", away: "" }); setMetrics([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setSelectedIdx(0);
    setError(null);
    fetch(`${BACKEND_URL}/match/${matchFile}/game_phases`)
      .then(res => res.json())
      .then(res => {
        if (cancelled) return;
        if (res.error) throw new Error(res.error);
        setPhases(res.phases || []);
        setTeams({ home: res.home_team || "", away: res.away_team || "" });
        setMetrics(res.phase_metrics || []);
      })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [matchFile]);

  const ready = !loading && !error && phases.length > 0;
  const phase = phases[selectedIdx];

  return (
    <CollapsibleSection title="Game Phases" subtitle="One phase at a time. Pick a phase below.">
      {ready && (
        <div className={styles.phasePicker}>
          <button
            type="button"
            className={styles.phaseNavButton}
            onClick={() => setSelectedIdx(i => Math.max(0, i - 1))}
            disabled={selectedIdx <= 0}
            aria-label="Previous phase"
          >{"←"}</button>
          <div className={styles.phaseTabs} role="tablist" aria-label="Game phases">
            {phases.map((p, i) => (
              <button
                key={p.phase_idx}
                type="button"
                role="tab"
                aria-selected={i === selectedIdx}
                className={i === selectedIdx ? styles.phaseTabActive : styles.phaseTab}
                onClick={() => setSelectedIdx(i)}
              >
                <span className={styles.phaseTabName}>Phase {p.phase_idx}</span>
                <span className={styles.phaseTabTime}>{formatClock(p.start_minute, p.start_second)}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className={styles.phaseNavButton}
            onClick={() => setSelectedIdx(i => Math.min(phases.length - 1, i + 1))}
            disabled={selectedIdx >= phases.length - 1}
            aria-label="Next phase"
          >{"→"}</button>
        </div>
      )}
      {loading && <div className={styles.gamePhasesLoading}>Loading phases...</div>}
      {error && <div className={styles.gamePhasesError}>{error}</div>}
      {!loading && !error && phases.length === 0 && (
        <div className={styles.gamePhasesEmpty}>No phases detected for match.</div>
      )}
      {ready && phase && (
        <div className={styles.gamePhasesList}>
          <PhaseCard
            matchFile={matchFile}
            phase={phase}
            metrics={metrics.find(mm => mm.phase_idx === phase.phase_idx)}
            teams={teams}
            importantMoments={importantMoments}
          />
        </div>
      )}
    </CollapsibleSection>
  );
}
