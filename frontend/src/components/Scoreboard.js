import React from "react";

export default function Scoreboard({ stage, home, away, score }) {
  if (!home || !away) return null;
  return (
    <div style={{ marginTop: 30, marginBottom: 30, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px 40px",
          border: "1px solid #e5e7eb",
          borderRadius: "10px",
          padding: "20px 30px",
          backgroundColor: "#f9fafb",
          width: "360px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
        }}
      >
        {stage && (
          <div style={{
            gridColumn: "1 / span 2",
            textAlign: "center",
            fontSize: "1rem",
            fontWeight: 600,
            color: "#6b7280",
            marginBottom: "8px"
          }}>
            {stage}
          </div>
        )}

        <div style={{
          gridColumn: "1 / span 2",
          display: "flex",
          justifyContent: "space-between",
          fontWeight: 700,
          fontSize: "1.2rem",
        }}>
          <span>{home}</span>
          <span>{away}</span>
        </div>

        <div style={{
          gridColumn: "1 / span 2",
          display: "flex",
          justifyContent: "space-between",
          color: "#4b5563",
        }}>
          <span>Goals</span>
        </div>

        <div style={{
          display: "flex",
          justifyContent: "space-between",
          gridColumn: "1 / span 2",
          fontSize: "1.1rem",
          fontWeight: 600,
        }}>
          <span>{score ? score.split(" - ")[0] : "-"}</span>
          <span>{score ? score.split(" - ")[1] : "-"}</span>
        </div>
      </div>
    </div>
  );
}
