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
      {matches.map(m => (
        <option key={m.file} value={m.file}>
          {m.label || m.name}
        </option>
      ))}
    </select>
  );
}
