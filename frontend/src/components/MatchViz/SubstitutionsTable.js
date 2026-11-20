import React from "react";
import styles from "./MatchViz.module.css";

const clock = (minute, second) => `${minute}:${String(second).padStart(2, "0")}`;

/** Substitutions made during one phase, home column then away column. */
export default function SubstitutionsTable({ teams, substitutions }) {
  return (
    <div className={styles.phaseSubstitutionsContainer}>
      <h3 className={styles.phaseSubstitutionsTitle}>Substitutions</h3>
      <div className={styles.phaseSubstitutionsGrid}>
        {[teams.home, teams.away].map(team => {
          const subs = substitutions[team];
          return (
            <div key={team} className={styles.phaseSubstitutionsTeamColumn}>
              <div className={styles.phaseSubstitutionsTeamLabel}>{team}</div>
              {Array.isArray(subs) && subs.length > 0 ? (
                <table className={styles.phaseSubstitutionsTable}>
                  <thead>
                    <tr>
                      <th className={styles.phaseSubstitutionsHeaderCell}>Time</th>
                      <th className={styles.phaseSubstitutionsHeaderCell}>Off</th>
                      <th className={styles.phaseSubstitutionsHeaderCell}>Position</th>
                      <th className={styles.phaseSubstitutionsHeaderCell}>On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subs.map((sub, i) => (
                      <tr key={i} className={styles.phaseSubstitutionsRow}>
                        <td className={styles.phaseSubstitutionsCell}>{clock(sub.minute, sub.second)}</td>
                        <td className={styles.phaseSubstitutionsCell}>{sub.player_off || "—"}</td>
                        <td className={styles.phaseSubstitutionsCell}>{sub.position_off || "—"}</td>
                        <td className={styles.phaseSubstitutionsCell}>{sub.player_on || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className={styles.noSubstitutionsPlaceholder}>No substitutions</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
