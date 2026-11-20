import React from "react";
import styles from "../MatchViz/MatchViz.module.css";

// A 120 x 80 pitch drawn as SVG. `highlightAttack` shades the box the team is attacking.
function Pitch({ highlightAttack = false, children }) {
  return (
    <svg viewBox="0 0 120 80" className={styles.shotMapSvg}>
      <rect x="0" y="0" width="120" height="80" fill="#f9f9f9" stroke="#888" strokeWidth="0.5" />
      <line x1="60" y1="0" x2="60" y2="80" stroke="#888" strokeWidth="0.5" />
      {highlightAttack && (
        <rect x="102" y="18" width="18" height="44" fill="rgba(255, 200, 200, 0.3)" stroke="#888" strokeWidth="0.8" />
      )}
      <rect x="0" y="18" width="18" height="44" fill="none" stroke="#888" strokeWidth="0.5" />
      {!highlightAttack && <rect x="102" y="18" width="18" height="44" fill="none" stroke="#888" strokeWidth="0.5" />}
      <rect x="0" y="30" width="6" height="20" fill="none" stroke="#888" strokeWidth="0.5" />
      <rect x="114" y="30" width="6" height="20" fill="none" stroke="#888" strokeWidth="0.5" />
      <circle cx="12" cy="40" r="0.8" fill="#888" />
      <circle cx="108" cy="40" r="0.8" fill="#888" />
      <rect x="0" y="36" width="0.5" height="8" fill="#333" stroke="#333" strokeWidth="0.3" />
      <rect x="119.5" y="36" width="0.5" height="8" fill="#333" stroke="#333" strokeWidth="0.3" />
      {children}
    </svg>
  );
}

// Dot radius (pitch units) for a shot: grows with the square root of xG, so AREA follows xG
export function shotRadius(xg) {
  const v = Number(xg);
  return 1.5 + 5 * Math.sqrt(Number.isFinite(v) && v > 0 ? v : 0);
}

export function EventMap({ events = [] }) {
  return (
    <Pitch>
      {events.map((event, i) => {
        const cx = event.x;
        const cy = 80 - event.y;
        if (event.event_type === "red_card") {
          return (
            <rect key={i} x={cx - 2.5} y={cy - 2.5} width="5" height="5" fill={event.color} stroke="black" strokeWidth="0.5" opacity="0.9">
              <title>{`${event.player}\nRed Card`}</title>
            </rect>
          );
        }
        if (event.event_type === "own_goal") {
          return (
            <g key={i}>
              <line x1={cx - 3} y1={cy - 3} x2={cx + 3} y2={cy + 3} stroke={event.color} strokeWidth="1.5" />
              <line x1={cx - 3} y1={cy + 3} x2={cx + 3} y2={cy - 3} stroke={event.color} strokeWidth="1.5" />
              <title>{`${event.player}\nOwn Goal For`}</title>
            </g>
          );
        }
        const outcome = String(event.outcome || "").toLowerCase();
        const r = shotRadius(event.xg);
        const k = r * 0.7; // half-size of the little marks drawn on top of a dot
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={r} fill={event.color} stroke="black" strokeWidth="0.3" opacity="0.85">
              <title>{`${event.player}\nxG: ${event.xg}\n${event.outcome}`}</title>
            </circle>
            {(outcome === "woodwork" || outcome === "post" || outcome === "saved to post") && (
              <>
                <line x1={cx - k} y1={cy - k} x2={cx + k} y2={cy + k} stroke="white" strokeWidth="2" />
                <line x1={cx - k} y1={cy + k} x2={cx + k} y2={cy - k} stroke="white" strokeWidth="2" />
                <line x1={cx - k} y1={cy - k} x2={cx + k} y2={cy + k} stroke="black" strokeWidth="0.5" />
                <line x1={cx - k} y1={cy + k} x2={cx + k} y2={cy - k} stroke="black" strokeWidth="0.5" />
              </>
            )}
            {outcome === "saved" && <circle cx={cx} cy={cy} r={r + 1} fill="none" stroke="red" strokeWidth="1.2" />}
            {outcome === "blocked" && (
              <>
                <line x1={cx - k} y1={cy - k} x2={cx + k} y2={cy + k} stroke="red" strokeWidth="1" />
                <line x1={cx - k} y1={cy + k} x2={cx + k} y2={cy - k} stroke="red" strokeWidth="1" />
              </>
            )}
            {outcome === "wayward" && (
              <text x={cx} y={cy + 1.5} textAnchor="middle" fontSize="5" fill="purple" fontWeight="bold">?</text>
            )}
          </g>
        );
      })}
    </Pitch>
  );
}

export function BoxEntryMap({ entries = [] }) {
  return (
    <Pitch highlightAttack>
      {entries.map((entry, i) => {
        const base = entry.type === "pass" ? "#2196F3" : "#FF9800";
        const color = entry.color || base;
        return (
          <g key={i}>
            <line
              x1={entry.x1} y1={80 - entry.y1} x2={entry.x2} y2={80 - entry.y2}
              stroke={color} strokeWidth="1.5" strokeDasharray={entry.type === "pass" ? "2,2" : "0"} opacity="0.7"
            />
            <circle cx={entry.x2} cy={80 - entry.y2} r="2" fill={color} stroke="black" strokeWidth="0.3" opacity="0.75">
              <title>{entry.type === "pass" ? "Pass into box" : "Carry into box"}</title>
            </circle>
          </g>
        );
      })}
    </Pitch>
  );
}
