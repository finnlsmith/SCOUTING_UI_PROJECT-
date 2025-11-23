import React from "react";
import styles from "./MatchSelector.module.css";

export default function MatchSelector({
  matches,
  selectedMatch,
  onChange,
  matchesLoading
}) {
  return (
    <select
      className={styles.select}
      value={selectedMatch}
      onChange={e => onChange(e.target.value)}
      disabled={matchesLoading}
    >
      <option value="">-- Choose a match --</option>
      {matches
      // 1) Filter out "Frames 360"
      .filter(m => !m.name.includes("Frames 360"))

      // 2) Render cleaned text
      .map(m => {
        const cleanedLabel = (m.label || m.name).replace(/ - Events$/, "");
        return (
          <option key={m.file} value={m.file}>
            {cleanedLabel}
          </option>
        );
      })}
    </select>
  );
}
