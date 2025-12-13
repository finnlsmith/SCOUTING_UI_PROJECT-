import React from "react";
import EventMapSVG from "./EventMapSVG";
import styles from "./MatchViz.module.css";

export default function PhaseEventMaps({ shotMapData, homeTeam, awayTeam }) {
  if (!shotMapData) return null;

  return (
    <div className={styles.shotMapsContainer}>
      <h3 className={styles.shotMapsTitle}>Key Event Maps (shots, cards, own goals)</h3>
      <div className={styles.shotMapsGrid}>
        <div className={styles.shotMapCard}>
          <div className={styles.shotMapTeamLabel}>{homeTeam}</div>
          <EventMapSVG events={shotMapData[homeTeam] || []} className={styles.shotMapSvg} />
        </div>
        <div className={styles.shotMapCard}>
          <div className={styles.shotMapTeamLabel}>{awayTeam}</div>
          <EventMapSVG events={shotMapData[awayTeam] || []} flip className={styles.shotMapSvg} />
        </div>
      </div>
      <div className={styles.shotMapLegend}>
        <span>
          <span className={styles.legendDot} style={{ backgroundColor: "green" }}></span> Goal
        </span>
        <span>
          <span className={styles.legendDot} style={{ backgroundColor: "yellow" }}></span> High xG (≥0.27)
        </span>
        <span>
          <span className={styles.legendDot} style={{ backgroundColor: "orange" }}></span> Med xG (0.08-0.27)
        </span>
        <span>
          <span className={styles.legendDot} style={{ backgroundColor: "black" }}></span> Low xG (&lt;0.08)
        </span>
        <span>
          <span className={styles.legendSquare}></span> Red Card
        </span>
        <span>
          <span className={styles.legendX}></span> Own Goal For
        </span>
      </div>
    </div>
  );
}

