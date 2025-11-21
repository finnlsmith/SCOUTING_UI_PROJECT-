import React from "react";
import styles from "./Scoreboard.module.css";

export default function Scoreboard({ stage, home, away, score, shots, shotsOnTarget, xg, bigChances, okChances, fouls, cardsLeft, cardsRight, boxEntries }) {
  if (!home || !away) return null;
  return (
    <div className={styles.container}>
      <div className={styles.scoreboard}>
        {stage && (
          <div className={styles.stage}>
            {stage}
          </div>
        )}

        <div className={styles.teamNames}>
          <span>{home}</span>
          <span>{away}</span>
        </div>

        <div className={styles.label}>
          <span>Goals</span>
        </div>

        {/* Goals row values */}
        <div className={styles.values}>
          <span>{score ? score.split(" - ")[0] : "-"}</span>
          <span>{score ? score.split(" - ")[1] : "-"}</span>
        </div>
        {/* Shots row label */}
        <div className={styles.label}>
          <span>Shots</span>
        </div>
        {/* Shots row values */}
        <div className={styles.values}>
          <span>{shots ? shots.split(" - ")[0] : "-"}</span>
          <span>{shots ? shots.split(" - ")[1] : "-"}</span>
        </div>
        {/* Shots on Target label */}
        <div className={styles.label}>
          <span>Shots on Target</span>
        </div>
        {/* Shots on Target values */}
        <div className={styles.values}>
          <span>{shotsOnTarget ? shotsOnTarget.split(" - ")[0] : "-"}</span>
          <span>{shotsOnTarget ? shotsOnTarget.split(" - ")[1] : "-"}</span>
        </div>
        {/* xG label */}
        <div className={styles.label}>
          <span>xG</span>
        </div>
        {/* xG values */}
        <div className={styles.values}>
          <span>{xg ? xg.split(" - ")[0] : "-"}</span>
          <span>{xg ? xg.split(" - ")[1] : "-"}</span>
        </div>

        {/* Big Chances label */}
        <div className={styles.label}>
          <span>Big Chances (≥ 0.27 xG)</span>
        </div>
        {/* Big Chances values */}
        <div className={styles.values}>
          <span>{bigChances ? bigChances.split(" - ")[0] : "-"}</span>
          <span>{bigChances ? bigChances.split(" - ")[1] : "-"}</span>
        </div>

        {/* OK Chances label */}
        <div className={styles.label}>
          <span>OK Chances (0.08–0.27 xG)</span>
        </div>
        {/* OK Chances values */}
        <div className={styles.values}>
          <span>{okChances ? okChances.split(" - ")[0] : "-"}</span>
          <span>{okChances ? okChances.split(" - ")[1] : "-"}</span>
        </div>

        {/* Box Entries label */}
        <div className={styles.label}>
          <span>Opp. Box Entries</span>
        </div>
        {/* Box Entries values */}
        <div className={styles.values}>
          <span>{boxEntries ? boxEntries.split(" - ")[0] : "-"}</span>
          <span>{boxEntries ? boxEntries.split(" - ")[1] : "-"}</span>
        </div>

        {/* Fouls label */}
        <div className={styles.label}>
          <span>Fouls Committed</span>
        </div>
        {/* Fouls values */}
        <div className={styles.values}>
          <span>{fouls ? fouls.split(" - ")[0] : "-"}</span>
          <span>{fouls ? fouls.split(" - ")[1] : "-"}</span>
        </div>

        {/* Cards label */}
        <div className={styles.label}>
          <span>Cards (yellow/red)</span>
        </div>
        {/* Cards values: format total (yellow/red) */}
        <div className={styles.values}>
          <span>{cardsLeft ?? '-'}</span>
          <span>{cardsRight ?? '-'}</span>
        </div>
      </div>
    </div>
  );
}
