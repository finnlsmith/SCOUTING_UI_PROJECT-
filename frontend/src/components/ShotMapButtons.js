import React from "react";

export default function ShotMapButtons({ home, away, onHome, onAway, onBoth }) {
  if (!home || !away) return null;
  return (
    <div style={{ marginTop: 20 }}>
      <button onClick={onHome} style={{ marginRight: 12, padding: "8px 14px" }}>
        Shot Map – {home}
      </button>
      <button onClick={onAway} style={{ marginRight: 12, padding: "8px 14px" }}>
        Shot Map – {away}
      </button>
      <button
        onClick={onBoth}
        style={{
          padding: "8px 14px",
          backgroundColor: "#f0f0f0",
          border: "1px solid #ccc",
        }}
      >
        Both Teams Shot Map
      </button>
    </div>
  );
}
