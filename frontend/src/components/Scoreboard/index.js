import React from "react";
import styles from "./Scoreboard.module.css";

export default function Scoreboard({ stage, home, away, score, shots, shotsOnTarget, xg, bigChances, okChances, fouls, cardsLeft, cardsRight, boxEntries }) {
  if (!home || !away) return null;
  
  // Parse values for combined rows
  const homeShots = shots ? shots.split(" - ")[0] : "-";
  const awayShots = shots ? shots.split(" - ")[1] : "-";
  const homeSoT = shotsOnTarget ? shotsOnTarget.split(" - ")[0] : "-";
  const awaySoT = shotsOnTarget ? shotsOnTarget.split(" - ")[1] : "-";
  const homeBig = bigChances ? bigChances.split(" - ")[0] : "-";
  const awayBig = bigChances ? bigChances.split(" - ")[1] : "-";
  const homeOk = okChances ? okChances.split(" - ")[0] : "-";
  const awayOk = okChances ? okChances.split(" - ")[1] : "-";
  
  // Calculate All Chances (Big + OK)
  const homeAllChances = (homeBig !== "-" && homeOk !== "-") ? (parseInt(homeBig) + parseInt(homeOk)) : "-";
  const awayAllChances = (awayBig !== "-" && awayOk !== "-") ? (parseInt(awayBig) + parseInt(awayOk)) : "-";
  
  return (
    <div className={styles.container}>
      <div className={styles.scoreboard}>
        {/* Team names header for column alignment */}
        <div className={styles.teamNames}>
          <span>{home}</span>
          <span>{away}</span>
        </div>

        {/* Shots (on Target) row - combined */}
        <div className={styles.label}>
          <span>Shots (on Target)</span>
        </div>
        <div className={styles.values}>
          <span>{homeShots} ({homeSoT})</span>
          <span>{awayShots} ({awaySoT})</span>
        </div>
        
        {/* xG (pen.) label */}
        <div className={styles.label}>
          <span>xG (pen.)</span>
        </div>
        {/* xG values */}
        <div className={styles.values}>
          <span>{xg ? xg.split(" - ")[0] : "-"}</span>
          <span>{xg ? xg.split(" - ")[1] : "-"}</span>
        </div>

        {/* Chances (All/Big) row - combined */}
        <div className={styles.label}>
          <span>Chances (All/Big)</span>
        </div>
        <div className={styles.values}>
          <span>{homeAllChances}/{homeBig}</span>
          <span>{awayAllChances}/{awayBig}</span>
        </div>

        {/* Box Entries label */}
        <div className={styles.label}>
          <span>Box Entries</span>
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
