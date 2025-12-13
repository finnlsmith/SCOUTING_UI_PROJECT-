import React from "react";
import BoxEntryMapSVG from "./BoxEntryMapSVG";
import styles from "./MatchViz.module.css";

export default function PhaseBoxEntryMaps({ boxEntryLocations, homeTeam, awayTeam }) {
  if (!boxEntryLocations) return null;

  return (
    <div className={styles.shotMapsContainer}>
      <h3 className={styles.shotMapsTitle}>Box Entry Maps</h3>
      <div className={styles.shotMapsGrid}>
        <div className={styles.shotMapCard}>
          <div className={styles.shotMapTeamLabel}>{homeTeam}</div>
          <BoxEntryMapSVG
            entries={boxEntryLocations[homeTeam] || []}
            attackingSide="right"
            className={styles.shotMapSvg}
          />
        </div>
        <div className={styles.shotMapCard}>
          <div className={styles.shotMapTeamLabel}>{awayTeam}</div>
          <BoxEntryMapSVG
            entries={boxEntryLocations[awayTeam] || []}
            flip
            attackingSide="left"
            className={styles.shotMapSvg}
          />
        </div>
      </div>
      <div className={styles.shotMapLegend}>
        <span>
          <span
            className={styles.legendLine}
            style={{ backgroundColor: "#2196F3", borderStyle: "dashed" }}
          ></span>{" "}
          Pass into box
        </span>
        <span>
          <span className={styles.legendLine} style={{ backgroundColor: "#FF9800" }}></span> Carry into
          box
        </span>
      </div>
    </div>
  );
}

