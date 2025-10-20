import React from "react";

export default function PassingNetworkButtons({
  home,
  away,
  disabled,
  onHomePN,
  onAwayPN,
}) {
  return (
    <div style={{ marginTop: 20 }}>
      <h3>Passing Network</h3>
      <div>
        <button
          onClick={onHomePN}
          disabled={disabled || !home}
          style={{
            marginRight: 10,
            padding: "8px 14px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          {home ? `${home} Network` : "Home Network"}
        </button>

        <button
          onClick={onAwayPN}
          disabled={disabled || !away}
          style={{
            padding: "8px 14px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          {away ? `${away} Network` : "Away Network"}
        </button>
      </div>
    </div>
  );
}
