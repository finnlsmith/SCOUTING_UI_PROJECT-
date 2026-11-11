import React from "react";
import styles from "./MatchSelector.module.css";

// Order the tournament stages are shown in. Any other stage is listed after these, oldest first.
const STAGE_ORDER = ["Group Stage", "Round of 16", "Quarter-finals", "Semi-finals", "Final"];

const dateOf = m => m.date || (m.label || "").match(/\d{4}-\d{2}-\d{2}/)?.[0] || "";
const cleanLabel = m => (m.label || m.name || "").replace(/ – Events$/, "");

/**
 * Match picker. Matches are sorted by date (earliest first) and, when the backend
 * provides a stage, grouped under that stage's heading.
 */
export default function MatchSelector({
  matches,
  selectedMatch,
  onChange,
  matchesLoading
}) {
  // Event files only (each match also has a "Frames 360" entry we don't list)
  const events = (matches || [])
    .filter(m => !(m.label || "").includes("Frames 360"))
    .sort((a, b) => dateOf(a).localeCompare(dateOf(b)) || cleanLabel(a).localeCompare(cleanLabel(b)));

  const groups = new Map();
  events.forEach(m => {
    const key = m.stage || "Other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(m);
  });

  const rank = stage => {
    if (stage === "Other") return 1000;
    const i = STAGE_ORDER.indexOf(stage);
    return i === -1 ? 500 : i;
  };
  const orderedStages = [...groups.keys()].sort(
    (a, b) => rank(a) - rank(b) || dateOf(groups.get(a)[0]).localeCompare(dateOf(groups.get(b)[0]))
  );

  const renderOption = m => (
    <option key={m.file} value={m.file}>{cleanLabel(m)}</option>
  );

  // Older backends send no stage: show a plain, date-sorted list.
  const grouped = !(orderedStages.length === 1 && orderedStages[0] === "Other");

  return (
    <select
      className={styles.select}
      aria-label="Select a match"
      value={selectedMatch}
      onChange={e => onChange(e.target.value)}
      disabled={matchesLoading}
    >
      <option value="">Select a match…</option>
      {grouped
        ? orderedStages.map(stage => (
            <optgroup key={stage} label={stage}>
              {groups.get(stage).map(renderOption)}
            </optgroup>
          ))
        : events.map(renderOption)}
    </select>
  );
}
