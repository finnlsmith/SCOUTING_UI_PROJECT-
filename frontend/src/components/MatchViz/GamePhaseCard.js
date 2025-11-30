import React from "react";
import PhaseMetricsTable from "./PhaseMetricsTable";
import PhaseEventMaps from "./PhaseEventMaps";
import PhaseBoxEntryMaps from "./PhaseBoxEntryMaps";
import styles from "./MatchViz.module.css";

export default function GamePhaseCard({ phase, metrics, homeTeam, awayTeam }) {
  if (!metrics) return null;

  return (
    <div className={styles.gamePhaseCard}>
      <div className={styles.gamePhaseTitle}>Game Phase {phase.phase_idx}</div>
      <div className={styles.gamePhaseTime}>
        <b>From: </b>
        {`${phase.start_minute}:${String(phase.start_second).padStart(2, "0")}`} <b>— To: </b>
        {phase.end_minute !== null
          ? `${phase.end_minute}:${String(phase.end_second).padStart(2, "0")}`
          : "End"}
      </div>
      <div className={styles.gamePhaseScore}>
        <b>Score: </b>
        {homeTeam} {phase.score_start} {awayTeam}
        {phase.score_end ? ` → ${phase.score_end}` : ""}
      </div>
      {phase.goal_info && phase.goal_info.scorer && (
        <div className={styles.gamePhaseGoalInfo}>
          Goal Event: <b>{phase.goal_info.event_type}</b>
          {phase.goal_info.own_goal_team
            ? ` (Own goal by ${phase.goal_info.own_goal_team})`
            : ""}
          , scored by <b>{phase.goal_info.scorer}</b>
        </div>
      )}
      {Array.isArray(phase.break_reasons) && phase.break_reasons.length > 0 && (
        <div className={styles.gamePhaseBreakReasons}>
          Phase ended by:{" "}
          {phase.break_reasons.map((r) => (r === "half_end" ? "Half Ended" : r)).join(", ")}
        </div>
      )}
      <div className={styles.metricsContainer}>
        <PhaseMetricsTable metrics={metrics} homeTeam={homeTeam} awayTeam={awayTeam} />
        <PhaseEventMaps
          shotMapData={metrics.shot_map_data}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
        />
        <PhaseBoxEntryMaps
          boxEntryLocations={metrics.box_entry_locations}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
        />
      </div>
    </div>
  );
}

