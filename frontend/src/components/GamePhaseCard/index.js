import React, { Suspense, lazy, useEffect } from "react";
import { PlotSkeleton } from "../LoadingSkeleton";
import { EventMap, BoxEntryMap } from "./PhaseMaps";
import base from "../MatchViz/MatchViz.module.css"; // shared table / card styles
import styles from "./GamePhaseCard.module.css";

const ShotMapPlot = lazy(() => import("../ShotMapPlot"));

const clock = (min, sec) => `${min}:${String(sec).padStart(2, "0")}`;

function SubstitutionList({ teams, substitutions }) {
  const withSubs = [teams.home, teams.away].filter(
    t => Array.isArray(substitutions?.[t]) && substitutions[t].length > 0
  );
  if (withSubs.length === 0) {
    return <div className={styles.noSubs}>No substitutions in this phase</div>;
  }
  return (
    <div className={styles.subsGrid}>
      {withSubs.map(team => (
        <div key={team}>
          <div className={base.phaseSubstitutionsTeamLabel}>{team}</div>
          <table className={base.phaseSubstitutionsTable}>
            <thead>
              <tr>
                <th className={base.phaseSubstitutionsHeaderCell}>Time</th>
                <th className={base.phaseSubstitutionsHeaderCell}>Off</th>
                <th className={base.phaseSubstitutionsHeaderCell}>Position</th>
                <th className={base.phaseSubstitutionsHeaderCell}>On</th>
              </tr>
            </thead>
            <tbody>
              {substitutions[team].map((sub, i) => (
                <tr key={i} className={base.phaseSubstitutionsRow}>
                  <td className={base.phaseSubstitutionsCell}>{clock(sub.minute, sub.second)}</td>
                  <td className={base.phaseSubstitutionsCell}>{sub.player_off || "—"}</td>
                  <td className={base.phaseSubstitutionsCell}>{sub.position_off || "—"}</td>
                  <td className={base.phaseSubstitutionsCell}>{sub.player_on || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function StatsTable({ m, teams }) {
  const { home, away } = teams;
  const both = (obj, fmt) => [fmt(obj?.[home]), fmt(obj?.[away])];
  const n = v => v ?? 0;
  const rows = [
    ["Shots (On Target)", ...both(m.shots_summary, v => `${n(v?.total)} (${n(v?.on_target)})`)],
    ["Chances (All/Big)", ...both(m.chances, v => `${n(v?.ok)} / ${n(v?.good)}`)],
    ["Final Third Entries", ...both(m.final_third_entries, n)],
    ["Box Entries", ...both(m.box_entries, n)],
    ["Possession %", ...both(m.possession_pct_by_passes, v => `${n(v)}%`)],
    ["Goals", ...both(m.goals, n)],
    ["Fouls", ...both(m.fouls, n)],
    ["Cards (Yellow / Red)", ...both(m.cards, v => `${n(v?.yellow)} / ${n(v?.red)}`)],
    ["Penalties", ...both(m.penalties, n)],
  ];
  return (
    <table className={base.phaseMetricsTable}>
      <thead>
        <tr>
          <th className={base.phaseMetricsHeaderCell}>{home}</th>
          <th className={base.phaseMetricsHeaderCell}></th>
          <th className={base.phaseMetricsHeaderCell}>{away}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, h, a]) => (
          <tr key={label} className={base.phaseMetricsRow}>
            <td className={base.phaseMetricsValueCell}>{h}</td>
            <td className={base.phaseMetricsLabelCell}>{label}</td>
            <td className={base.phaseMetricsValueCell}>{a}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MomentsPanel({ ph, moments, scene, showScenes, onToggleScenes, onMomentClick }) {
  // Scenes are on by default: show the first moment as soon as the phase opens
  useEffect(() => {
    if (showScenes && moments.length > 0 && !scene) onMomentClick(0, moments[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ph.phase_idx, moments.length]);

  return (
    <div>
      <h3 className={styles.panelTitle}>
        Key Moments
        {moments.length > 0 && (
          <label className={base.showScenesLabel}>
            <input
              type="checkbox"
              checked={showScenes}
              onChange={e => {
                onToggleScenes(e.target.checked);
                if (e.target.checked && !scene) onMomentClick(0, moments[0]);
              }}
              className={base.showScenesCheckbox}
            />
            Show Scenes
          </label>
        )}
      </h3>
      {moments.length === 0 ? (
        <div className={base.noMomentsPlaceholder}>No key moments in this phase</div>
      ) : (
        <>
          <div className={styles.momentsScroll}>
            <table className={base.phaseMomentsTable}>
              <thead>
                <tr className={base.tableHeader}>
                  {["When", "Team", "Who", "Type", "xG", "Outcome"].map(h => (
                    <th key={h} className={base.phaseMomentsHeaderCell}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {moments.map((mo, i) => {
                  const selected = showScenes && scene?.selectedMomentIdx === i;
                  return (
                    <tr
                      key={i}
                      className={selected ? base.phaseMomentsRowSelected : base.phaseMomentsRow}
                      onClick={() => onMomentClick(i, mo)}
                      style={{ cursor: "pointer" }}
                    >
                      <td className={base.phaseMomentsCell}>{mo.when}</td>
                      <td className={base.phaseMomentsCell}>{mo.team}</td>
                      <td className={base.phaseMomentsCell}>{mo.who}</td>
                      <td className={base.phaseMomentsCell}>{mo.event_type}</td>
                      <td className={base.phaseMomentsCell}>{mo.xg !== undefined && mo.xg !== null ? mo.xg : ""}</td>
                      <td className={base.phaseMomentsCell}>{mo.outcome}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {showScenes && scene && (
            <div className={base.phaseSceneViewer}>
              {scene.loading && <div className={`skeleton ${styles.sceneSkeleton}`} aria-label="Loading scene" />}
              {scene.error && <div className={base.errorText}>{scene.error}</div>}
              {scene.imageBase64 && (
                <img src={`data:image/png;base64,${scene.imageBase64}`} alt="Phase Possession Scene" className={base.phaseSceneImage} />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// One titled section with the home team's map on the left and the away team's on the right
function TeamPair({ title, teams, children, legend }) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <div className={styles.pair}>
        {[teams.home, teams.away].map((team, i) => (
          <div key={team} className={base.shotMapCard}>
            <div className={base.shotMapTeamLabel}>{team}</div>
            {children(team, i)}
          </div>
        ))}
      </div>
      {legend}
    </section>
  );
}

export default function GamePhaseCard({ ph, m, teams, phaseMoments, scene, showScenes, onToggleScenes, onMomentClick }) {
  const reasons = Array.isArray(ph.break_reasons)
    ? ph.break_reasons.map(r => (r === "half_end" ? "Half Ended" : r)).join(", ")
    : "";
  const goal = ph.goal_info && ph.goal_info.scorer ? ph.goal_info : null;

  return (
    <div className={base.gamePhaseCard}>
      {/* Top: phase details on the left, substitutions on the right */}
      <div className={styles.top}>
        <div className={styles.summary}>
          <div className={styles.title}>Game Phase {ph.phase_idx}</div>
          <div className={styles.time}>
            <b>From: </b>{clock(ph.start_minute, ph.start_second)}{" "}
            <b>— To: </b>{ph.end_minute !== null ? clock(ph.end_minute, ph.end_second) : "End of match"}
          </div>
          <div className={styles.score}>
            <b>Score: </b>{teams.home} {ph.score_start} {teams.away}
            {ph.score_end ? ` → ${ph.score_end}` : ""}
          </div>
          {(goal || reasons) && (
            <div className={styles.endBlock}>
              {goal && (
                <div className={styles.endLine}>
                  Goal Event: <b>{goal.event_type}</b>
                  {goal.own_goal_team ? ` (Own goal by ${goal.own_goal_team})` : ""}, scored by <b>{goal.scorer}</b>
                </div>
              )}
              {reasons && (
                <div className={styles.endLine}>
                  Phase ended by: <b>{reasons}</b>
                </div>
              )}
            </div>
          )}
        </div>
        {m && (
          <div className={styles.subs}>
            <h3 className={styles.panelTitle}>Substitutions</h3>
            <SubstitutionList teams={teams} substitutions={m.substitutions} />
          </div>
        )}
      </div>

      {m && (
        <>
          {/* Stats on the left, key moments on the right */}
          <div className={styles.statsMoments}>
            <div>
              <h3 className={styles.panelTitle}>Phase Stats</h3>
              <StatsTable m={m} teams={teams} />
            </div>
            <MomentsPanel
              ph={ph}
              moments={phaseMoments}
              scene={scene}
              showScenes={showScenes}
              onToggleScenes={onToggleScenes}
              onMomentClick={onMomentClick}
            />
          </div>

          {m.shot_map_data && (
            <TeamPair
              title="Key Events (shots, red cards, own goals)"
              teams={teams}
              legend={(
                <>
                  <div className={base.shotMapLegend}>
                    <span><span className={base.legendDot} style={{ backgroundColor: "green" }}></span> Goal</span>
                    <span><span className={base.legendDot} style={{ backgroundColor: "yellow" }}></span> High xG (≥0.27)</span>
                    <span><span className={base.legendDot} style={{ backgroundColor: "orange" }}></span> Normal xG (0.08-0.27)</span>
                    <span><span className={base.legendDot} style={{ backgroundColor: "black" }}></span> Low xG (&lt;0.08)</span>
                    <span><span className={base.legendSquare}></span> Red Card</span>
                    <span><span className={base.legendX}></span> Own Goal For</span>
                    <span><b>Dot size = xG</b></span>
                  </div>
                  <div className={base.shotOutcomeLegend}>
                    <span><span className={base.legendWhiteX}></span> Woodwork/Post/Saved to Post</span>
                    <span><span className={base.legendRedCircle}></span> Saved</span>
                    <span><span className={base.legendRedX}></span> Blocked</span>
                    <span><span className={base.legendQuestion}></span> Wayward</span>
                  </div>
                </>
              )}
            >
              {team => <EventMap events={m.shot_map_data[team] || []} />}
            </TeamPair>
          )}

          {m.box_entry_locations && (
            <TeamPair
              title="Box Entry Maps"
              teams={teams}
              legend={(
                <>
                  <div className={base.shotMapLegend}>
                    <span><span className={base.legendLine} style={{ backgroundColor: "#2196F3", borderStyle: "dashed" }}></span> Pass into box</span>
                    <span><span className={base.legendLine} style={{ backgroundColor: "#FF9800" }}></span> Carry into box</span>
                  </div>
                  <div className={base.shotOutcomeLegend}>
                    <span><span className={base.legendDot} style={{ backgroundColor: "#00C853" }}></span> → Goal</span>
                    <span><span className={base.legendDot} style={{ backgroundColor: "#69F0AE" }}></span> → Own Goal</span>
                    <span><span className={base.legendDot} style={{ backgroundColor: "#FFF59D" }}></span> → Shot</span>
                  </div>
                </>
              )}
            >
              {team => <BoxEntryMap entries={m.box_entry_locations[team] || []} />}
            </TeamPair>
          )}

          {m.passing_networks && (
            <TeamPair
              title="Passing Networks"
              teams={teams}
              legend={<p className={styles.note}>Bubble size = touches, on one scale for both teams. Gold ring = substitute.</p>}
            >
              {(team, i) => (
                <div className={styles.plotFrame}>
                  <Suspense fallback={<PlotSkeleton fill />}>
                    <ShotMapPlot displayFig={m.passing_networks[team] || null} flipSides={i === 1} plotLoading={false} fit />
                  </Suspense>
                </div>
              )}
            </TeamPair>
          )}
        </>
      )}
    </div>
  );
}
