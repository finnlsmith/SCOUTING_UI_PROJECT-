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
  
  const split = (v, i) => (v ? v.split(" - ")[i] : "-");

  // One row: home value on the left, stat name in the middle, away value on the right
  const rows = [
    { label: "Shots (on Target)", home: `${homeShots} (${homeSoT})`, away: `${awayShots} (${awaySoT})` },
    { label: "xG (pen.)", home: split(xg, 0), away: split(xg, 1) },
    { label: "Chances (All/Big)", home: `${homeAllChances}/${homeBig}`, away: `${awayAllChances}/${awayBig}` },
    { label: "Box Entries", home: split(boxEntries, 0), away: split(boxEntries, 1) },
    { label: "Fouls Committed", home: split(fouls, 0), away: split(fouls, 1) },
    { label: "Cards (yellow/red)", home: cardsLeft ?? "-", away: cardsRight ?? "-" },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.scoreboard}>
        <div className={styles.teamNames}>
          <span>{home}</span>
          <span>{away}</span>
        </div>
        {rows.map(r => (
          <div key={r.label} className={styles.row}>
            <span className={styles.homeValue}>{r.home}</span>
            <span className={styles.statLabel}>{r.label}</span>
            <span className={styles.awayValue}>{r.away}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
