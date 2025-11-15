import React from "react";

export default function MatchSelector({
  matches,
  selectedMatch,
  onChange,
  matchesLoading
}) {
  return (
    <select
      style={{ width: '100%', padding: '8px', fontSize: '15px', borderRadius: 5, border: '1.1px solid #aaa', background: '#fff', marginBottom: 7 }}
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
