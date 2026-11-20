import React, { Suspense, lazy, useEffect, useState } from "react";
import { PlotSkeleton } from "../LoadingSkeleton";
import { EventMap, BoxEntryMap } from "./PhaseMaps";
import SequenceMap from "../SequenceMap";
import TouchesMap from "../TouchesMap";
import PlayerTable, { ATTACK_COLUMNS, CREATION_COLUMNS } from "../PlayerTable";
import { fetchEventContext, fetchNetwork, fetchPlayerTables } from "../hooks/matchApi";
import base from "../MatchViz/MatchViz.module.css"; // shared table / card styles
import styles from "./GamePhaseCard.module.css";

const ShotMapPlot = lazy(() => import("../ShotMapPlot"));

// "red_card" -> "Red card", "half_end" -> "Half ended"
export const reasonLabel = r => {
  const known = { half_end: "Half ended" };
  if (known[r]) return known[r];
  const t = String(r).replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};

const clock = (min, sec) => `${min}:${String(sec).padStart(2, "0")}`;

// The slice of the match this phase covers (one period, match clock in seconds)
export const phaseWindow = ph => ({
  period: ph.start_period ?? undefined,
  start: ph.start_minute * 60 + ph.start_second,
  end: ph.end_minute != null ? ph.end_minute * 60 + ph.end_second : 1e6,
});

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
          <div className={styles.miniTeam}>{team}</div>
          <table className={styles.miniTable}>
            <thead>
              <tr><th>Time</th><th>Off</th><th>On</th></tr>
            </thead>
            <tbody>
              {substitutions[team].map((sub, i) => (
                <tr key={i}>
                  <td>{clock(sub.minute, sub.second)}</td>
                  <td>{sub.player_off || "-"}</td>
                  <td>{sub.player_on || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function SentOffList({ teams, sentOff }) {
  const rows = [teams.home, teams.away].flatMap(t => (sentOff?.[t] || []).map(r => ({ ...r, team: t })));
  if (rows.length === 0) return <div className={styles.noSubs}>No one sent off in this phase</div>;
  return (
    <table className={styles.miniTable}>
      <thead>
        <tr><th>Time</th><th>Team</th><th>Player</th><th>Card</th></tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td>{r.minute != null ? clock(r.minute, r.second ?? 0) : "-"}</td>
            <td>{r.team}</td>
            <td>{r.player}</td>
            <td>{r.card}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StatsTable({ m, teams }) {
  const { home, away } = teams;
  const both = (obj, fmt) => [fmt(obj?.[home]), fmt(obj?.[away])];
  const n = v => v ?? 0;
  // `key` rows (shots and chances) are drawn bigger and brighter than the rest
  const rows = [
    { label: "Shots (On Target)", key: true, vals: both(m.shots_summary, v => `${n(v?.total)} (${n(v?.on_target)})`) },
    { label: "Chances (All/Big)", key: true, vals: both(m.chances, v => `${n(v?.ok)} / ${n(v?.good)}`) },
    { label: "Final Third Entries", vals: both(m.final_third_entries, n) },
    { label: "Box Entries", vals: both(m.box_entries, n) },
    { label: "Possession %", vals: both(m.possession_pct_by_passes, v => `${n(v)}%`) },
    { label: "Goals", vals: both(m.goals, n) },
    { label: "Fouls", vals: both(m.fouls, n) },
    { label: "Cards (Yellow / Red)", vals: both(m.cards, v => `${n(v?.yellow)} / ${n(v?.red)}`) },
    { label: "Penalties", vals: both(m.penalties, n) },
    { label: "Def. errors (own half)", vals: both(m.defensive_errors, n) },
    { label: "Avg position (x / y)", vals: both(m.avg_position, v => (v ? `${v.x} / ${v.y}` : "-")) },
  ];
  return (
    <div className={styles.statsCard}>
      <div className={styles.statsHead}>
        <span className={styles.statsTeam}>{home}</span>
        <span />
        <span className={styles.statsTeam}>{away}</span>
      </div>
      {rows.map(r => (
        <div key={r.label} className={r.key ? styles.statsRowKey : styles.statsRow}>
          <span className={styles.statsVal}>{r.vals[0]}</span>
          <span className={styles.statsLabel}>{r.label}</span>
          <span className={styles.statsVal}>{r.vals[1]}</span>
        </div>
      ))}
    </div>
  );
}

function MomentsPanel({ ph, moments, scene, showScenes, onToggleScenes, onMomentClick }) {
  // Scenes are on by default: show the first moment as soon as the phase opens
  useEffect(() => {
    if (showScenes && moments.length > 0 && !scene) onMomentClick(0, moments[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ph.phase_idx, moments.length]);

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitleRow}>
        <span>Key Moments</span>
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
        <div className={showScenes ? styles.momentsLayout : undefined}>
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
            <div className={styles.sceneBox}>
              {scene.loading && <div className={`skeleton ${styles.sceneSkeleton}`} aria-label="Loading scene" />}
              {scene.error && <div className={base.errorText}>{scene.error}</div>}
              {scene.imageBase64 && (
                <img src={`data:image/png;base64,${scene.imageBase64}`} alt="Phase Possession Scene" className={styles.sceneImage} />
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// One titled section with the home team's panel on the left and the away team's on the right
function TeamPair({ title, teams, children, legend, extra }) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitleRow}>
        <span>{title}</span>
        {extra}
      </h3>
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

function KeyEventsLegend() {
  return (
    <div className={styles.legendBox}>
      <div className={styles.legendGroup}>
        <div className={styles.legendHead}>Shots <small>(dot size = xG)</small></div>
        <span><i className={styles.dot} style={{ background: "green" }} /> Goal</span>
        <span><i className={styles.dot} style={{ background: "yellow" }} /> High xG (0.27+)</span>
        <span><i className={styles.dot} style={{ background: "orange" }} /> Normal xG (0.08 - 0.27)</span>
        <span><i className={styles.dot} style={{ background: "black" }} /> Low xG (under 0.08)</span>
      </div>
      <div className={styles.legendGroup}>
        <div className={styles.legendHead}>What happened to the shot</div>
        <span><i className={styles.markSaved} /> Saved</span>
        <span><i className={styles.markBlocked} /> Blocked</span>
        <span><i className={styles.markPost} /> Hit the woodwork</span>
        <span><b className={styles.markWayward}>?</b> Wayward</span>
      </div>
      <div className={styles.legendGroup}>
        <div className={styles.legendHead}>Other events</div>
        <span><i className={styles.triangle} /> Defensive error (own half)</span>
        <span><i className={styles.triangleGoal} /> Error that led to a goal (black outline)</span>
        <span><i className={styles.square} /> Red card</span>
        <span><b className={styles.markOwnGoal}>X</b> Own goal</span>
      </div>
      <div className={styles.legendNote}>Hover for the details. Click a shot, or a mistake that led to one, to see the lead-up below.</div>
    </div>
  );
}

function BoxEntryLegend() {
  return (
    <div className={styles.legendBox}>
      <div className={styles.legendGroup}>
        <div className={styles.legendHead}>How the team got in</div>
        <span><i className={styles.lineDashed} /> Pass into the box</span>
        <span><i className={styles.lineSolid} /> Carry into the box</span>
        <span><i className={styles.diamond} /> Ball won in the box (no pass or carry)</span>
      </div>
      <div className={styles.legendGroup}>
        <div className={styles.legendHead}>What came next (within 10s)</div>
        <span><i className={styles.dot} style={{ background: "#00C853" }} /> Goal</span>
        <span><i className={styles.dot} style={{ background: "#69F0AE" }} /> Own goal</span>
        <span><i className={styles.dot} style={{ background: "#FFF59D" }} /> Shot</span>
      </div>
    </div>
  );
}

export default function GamePhaseCard({ filename, ph, m, teams, phaseMoments, scene, showScenes, onToggleScenes, onMomentClick }) {
  const win = phaseWindow(ph);
  const winKey = `${win.period}:${win.start}:${win.end}`;
  const goal = ph.goal_info && ph.goal_info.scorer ? ph.goal_info : null;
  const reasons = Array.isArray(ph.break_reasons)
    ? ph.break_reasons.map(reasonLabel).join(", ")
    : "";
  const scoreChanged = ph.score_end && ph.score_end !== ph.score_start;

  // ---- click a shot (or a mistake that led to one): lead-up + the minute before, for both teams ----
  const [selectedId, setSelectedId] = useState(null);
  const [context, setContext] = useState(null);
  const [leadNets, setLeadNets] = useState(null); // { [team]: figure | null }
  const [touchesFor, setTouchesFor] = useState(null); // { team, player }
  const [tables, setTables] = useState({});
  const [tablesLoading, setTablesLoading] = useState(true);

  useEffect(() => {
    if (!selectedId) { setContext(null); setLeadNets(null); return undefined; }
    let cancelled = false;
    setContext(null);
    setLeadNets(null);
    fetchEventContext(filename, selectedId).then(ctx => {
      if (cancelled) return;
      setContext(ctx);
      const w = ctx.network_window;
      return Promise.all([teams.home, teams.away].map((t, i) =>
        fetchNetwork(filename, t, { flip: i === 1, window: w }).then(f => [t, f]).catch(() => [t, null])
      )).then(pairs => { if (!cancelled) setLeadNets(Object.fromEntries(pairs)); });
    }).catch(() => { if (!cancelled) setSelectedId(null); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, filename]);

  useEffect(() => {
    let cancelled = false;
    setTables({});
    setTablesLoading(true);
    Promise.all([teams.home, teams.away].map(t =>
      fetchPlayerTables(filename, t, win).then(d => [t, d]).catch(() => [t, null])
    )).then(pairs => {
      if (cancelled) return;
      setTables(Object.fromEntries(pairs.filter(([, d]) => d)));
      setTablesLoading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filename, winKey]);

  const openTouches = (team, point) => {
    const player = point && (point.customdata && point.customdata[1] ? point.customdata[1] : point.text);
    if (player && point.data && point.data.name === "players") setTouchesFor({ team, player });
  };

  const leadActive = Boolean(selectedId);
  const shotLabel = context ? `${context.event.player}'s ${context.event.type.toLowerCase()} at ${clock(context.event.minute, context.event.second)}` : "";

  return (
    <div className={base.gamePhaseCard}>
      {/* Header: the time range, the score in the middle, then what ended the phase */}
      <div className={styles.header}>
        <div className={styles.timeRange}>
          {clock(ph.start_minute, ph.start_second)} - {ph.end_minute !== null ? clock(ph.end_minute, ph.end_second) : "End of match"}
        </div>
        <div className={styles.score}>
          <span>{teams.home}</span>
          <b className={styles.scoreNum}>{ph.score_start}</b>
          <span>{teams.away}</span>
          {ph.score_end && (
            <span className={scoreChanged ? styles.scoreChanged : styles.scoreSame}>
              {" "}→ {ph.score_end}
            </span>
          )}
        </div>
        {(goal || reasons) && (
          <div className={styles.endBlock}>
            {goal && (
              <div className={styles.endLine}>
                {goal.event_type === "Own Goal For" || goal.own_goal_team ? (
                  <>Goal Event: <b>Own goal</b>, credited to <b>{goal.scorer}</b></>
                ) : (
                  <>Goal Event: <b>{goal.event_type}</b>, scored by <b>{goal.scorer}</b></>
                )}
              </div>
            )}
            {reasons && <div className={styles.endLine}>Phase ended by: <b>{reasons}</b></div>}
          </div>
        )}
      </div>

      {m && (
        <>
          {/* Stats on the left; substitutions and sent-off players on the right */}
          <div className={styles.statsRow}>
            <StatsTable m={m} teams={teams} />
            <div className={styles.sideStack}>
              <div className={styles.sidePanel}>
                <h3 className={styles.panelTitle}>Substitutions</h3>
                <SubstitutionList teams={teams} substitutions={m.substitutions} />
              </div>
              <div className={styles.sidePanel}>
                <h3 className={styles.panelTitle}>Sent off</h3>
                <SentOffList teams={teams} sentOff={m.sent_off} />
              </div>
            </div>
          </div>

          <MomentsPanel
            ph={ph}
            moments={phaseMoments}
            scene={scene}
            showScenes={showScenes}
            onToggleScenes={onToggleScenes}
            onMomentClick={onMomentClick}
          />

          {m.shot_map_data && (
            <TeamPair title="Key Events (shots, red cards, own goals, mistakes)" teams={teams} legend={<KeyEventsLegend />}>
              {team => <EventMap events={m.shot_map_data[team] || []} selectedId={selectedId} onSelect={setSelectedId} />}
            </TeamPair>
          )}

          {/* Box entries, or the lead-up to the shot that was clicked above */}
          {leadActive ? (
            <section className={styles.section}>
              {context ? (
                <SequenceMap context={context} onClose={() => setSelectedId(null)} />
              ) : (
                <div className={`skeleton ${styles.leadSkeleton}`} aria-label="Loading lead-up" />
              )}
            </section>
          ) : (
            m.box_entry_locations && (
              <TeamPair title="Box Entry Maps" teams={teams} legend={<BoxEntryLegend />}>
                {team => <BoxEntryMap entries={m.box_entry_locations[team] || []} />}
              </TeamPair>
            )
          )}

          {/* Passing networks: the phase, or the minute before the clicked shot, or one player's touches */}
          {m.passing_networks && (
            <TeamPair
              title={leadActive ? `Passing networks: the 60 seconds before ${shotLabel}` : "Passing Networks"}
              teams={teams}
              extra={leadActive && <button type="button" className={styles.backBtn} onClick={() => setSelectedId(null)}>Back to the whole phase</button>}
              legend={<p className={styles.note}>Bubble size = touches, on one scale for both teams. Gold ring = substitute. Click a player to see where they touched the ball.</p>}
            >
              {(team, i) => {
                if (touchesFor && touchesFor.team === team && !leadActive) {
                  return (
                    <TouchesMap
                      filename={filename} team={team} player={touchesFor.player} window={win}
                      onClose={() => setTouchesFor(null)}
                    />
                  );
                }
                const fig = leadActive ? leadNets && leadNets[team] : m.passing_networks[team];
                return (
                  <div className={styles.plotFrame}>
                    {leadActive && !leadNets ? <PlotSkeleton fill /> : fig ? (
                      <Suspense fallback={<PlotSkeleton fill />}>
                        <ShotMapPlot
                          displayFig={fig} flipSides={false} plotLoading={false} fit
                          onPointClick={leadActive ? undefined : pt => openTouches(team, pt)}
                        />
                      </Suspense>
                    ) : <div className={styles.noNet}>No completed passes in this window.</div>}
                  </div>
                );
              }}
            </TeamPair>
          )}

          {/* The same per-player tables as the whole-match view, for just this phase */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitleRow}><span>Player stats in this phase</span></h3>
            <div className={styles.pair}>
              {[teams.home, teams.away].map(team => (
                <div key={team}>
                  <PlayerTable
                    title={`${team}: attacking involvement`} columns={ATTACK_COLUMNS}
                    rows={tables[team]?.attack} loading={tablesLoading}
                  />
                  <PlayerTable
                    title={`${team}: chance creation`} columns={CREATION_COLUMNS}
                    rows={tables[team]?.creation} loading={tablesLoading}
                  />
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
