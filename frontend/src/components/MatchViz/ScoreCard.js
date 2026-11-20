import React from "react";
import { BACKEND_URL } from "../../config/api";
import KeyEventsTimeline, { getKeyEvents } from "./KeyEventsTimeline";
import styles from "./MatchViz.module.css";

const hasScore = stats => Number.isFinite(stats.home_score) && Number.isFinite(stats.away_score);

function TeamBadge({ name }) {
  return (
    <div className={styles.vizHeaderTeamSection}>
      <img
        src={`${BACKEND_URL}/team-logo/${encodeURIComponent(name)}`}
        alt={name}
        className={styles.teamLogo}
        onError={e => { e.target.style.display = "none"; }}
      />
      <span className={styles.teamName}>{name}</span>
    </div>
  );
}

/** Teams, score, stage and date, with the goals/red-card timeline underneath. */
export default function ScoreCard({ stats, matchLabel, importantMoments }) {
  const date = matchLabel.match(/\d{4}-\d{2}-\d{2}/)?.[0] || "";
  return (
    <div className={styles.scoreCard}>
      <div className={styles.visualizationHeader}>
        <div className={styles.vizHeaderContent}>
          <TeamBadge name={stats.home_team} />
          <div className={styles.vizHeaderScoreSection}>
            <span className={styles.vizHeaderScore}>
              {hasScore(stats) ? `${stats.home_score} - ${stats.away_score}` : "0 - 0"}
            </span>
          </div>
          <TeamBadge name={stats.away_team} />
        </div>
        <div className={styles.vizHeaderMeta}>
          {stats.competition_stage && <span className={styles.vizHeaderStage}>{stats.competition_stage}</span>}
          {matchLabel && stats.competition_stage && <span className={styles.vizHeaderSeparator}>|</span>}
          {matchLabel && <span className={styles.vizHeaderDate}>{date}</span>}
        </div>
      </div>

      {importantMoments.length > 0 && (
        <KeyEventsTimeline
          keyEvents={getKeyEvents(importantMoments)}
          homeTeam={stats.home_team}
          awayTeam={stats.away_team}
        />
      )}
    </div>
  );
}
