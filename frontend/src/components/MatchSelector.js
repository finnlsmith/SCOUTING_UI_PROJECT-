import React from "react";

export default function MatchSelector({
  matches,
  selectedMatch,
  onChange,
  flipSides,
  onFlipChange,
  onReset,
  matchesLoading
}) {
  return (
    <div>
      <h3>Select a Match</h3>
      {matchesLoading ? (
        <p style={{ color: "#666" }}>Loading matches...</p>
      ) : (
        <>
          <select
            style={{ padding: "10px", fontSize: "16px", marginBottom: "20px" }}
            value={selectedMatch}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">-- Choose a match --</option>
            {matches.map((m) => (
              <option key={m.file} value={m.file}>
                {m.label || m.name}
              </option>
            ))}
          </select>

          {selectedMatch && (
            <label style={{ marginLeft: 18 }}>
              <input
                type="checkbox"
                checked={flipSides}
                onChange={(e) => onFlipChange(e.target.checked)}
                style={{ marginRight: 7 }}
              />
              Flip Sides
            </label>
          )}

          {(selectedMatch || matches.length > 0) && (
            <button
              style={{
                marginLeft: "16px",
                padding: "8px 18px",
                fontSize: "15px",
                backgroundColor: "#e0e0e0",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                color: "#333",
              }}
              onClick={onReset}
            >
              Reset
            </button>
          )}
        </>
      )}
    </div>
  );
}
