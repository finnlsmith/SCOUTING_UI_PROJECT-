import React from "react";
import styles from "./PlayerTable.module.css";

/**
 * One row per player, one column per stat. `columns` is [{ key, label, tip }]; `tip` explains the
 * stat when the header is hovered. Rows come from the backend's /player_tables response.
 */
export default function PlayerTable({ title, columns, rows, loading, note }) {
  return (
    <div className={styles.wrap}>
      {title && <h3 className={styles.title}>{title}</h3>}
      {loading ? (
        <div className={`skeleton ${styles.skeleton}`} aria-label="Loading table" />
      ) : !rows || rows.length === 0 ? (
        <div className={styles.empty}>No data for this team.</div>
      ) : (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={`${styles.th} ${styles.playerCol}`}>Player</th>
                {columns.map(c => (
                  <th key={c.key} className={styles.th} title={c.tip}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.player} className={styles.row}>
                  <td className={`${styles.td} ${styles.playerCol}`} title={r.player}>{r.short}</td>
                  {columns.map(c => (
                    <td key={c.key} className={`${styles.td} ${r[c.key] ? "" : styles.zero}`}>
                      {c.key === "xg" ? Number(r[c.key]).toFixed(2) : r[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {note && <p className={styles.note}>{note}</p>}
    </div>
  );
}

// Column sets for the two tables (labels short, `tip` gives the exact rule)
export const ATTACK_COLUMNS = [
  { key: "shots", label: "Shots", tip: "Shots taken" },
  { key: "xg", label: "xG", tip: "Total expected goals of the player's shots" },
  { key: "final_third_entries", label: "Final third entries", tip: "Completed passes and carries that start before the final third and end inside it" },
  { key: "box_touches", label: "Box touches", tip: "Passes, shots, dribbles, miscontrols and dispossessions inside the opponent's box" },
  { key: "goalside_receptions", label: "Goal-side receptions", tip: "Receptions where the player was closer to the opponent's goal than the opponent nearest to them (needs 360 data)" },
];

export const CREATION_COLUMNS = [
  { key: "line_breaking_passes", label: "Line-breaking passes", tip: "Completed forward passes that get past at least 3 opponents (needs 360 data)" },
  { key: "carries_into_box", label: "Carries into box", tip: "Carries that start outside the box and end inside it" },
  { key: "passes_into_box", label: "Passes into box", tip: "Completed passes and crosses that start outside the box and end inside it" },
  { key: "possession_ending", label: "Possession-ending actions", tip: "Dispossessed, miscontrol, shot, incomplete pass or cross, failed dribble, error, foul committed" },
  { key: "shot_creating", label: "Shot-creating actions", tip: "The pass, dribble or foul won right before a shot, or the one before that, each within 10 seconds of the shot" },
];
