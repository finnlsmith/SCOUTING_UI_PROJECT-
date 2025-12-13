import React from "react";
import PitchSVG from "./PitchSVG";

/**
 * Component for rendering box entry locations on a pitch
 */
export default function BoxEntryMapSVG({ entries = [], flip = false, attackingSide = "right", className = "" }) {
  const highlightBox = flip ? (attackingSide === "left" ? "left" : "right") : (attackingSide === "left" ? "left" : "right");

  return (
    <PitchSVG highlightAttackingBox={highlightBox} className={className}>
      {entries.map((entry, entryIdx) => {
        const x1 = flip ? 120 - entry.x1 : entry.x1;
        const y1 = 80 - entry.y1;
        const x2 = flip ? 120 - entry.x2 : entry.x2;
        const y2 = 80 - entry.y2;

        return (
          <g key={entryIdx}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={entry.type === "pass" ? "#2196F3" : "#FF9800"}
              strokeWidth="1.5"
              strokeDasharray={entry.type === "pass" ? "2,2" : "0"}
              opacity="0.7"
            />
            <circle
              cx={x2}
              cy={y2}
              r="2"
              fill={entry.type === "pass" ? "#2196F3" : "#FF9800"}
              stroke="black"
              strokeWidth="0.3"
              opacity="0.75"
            >
              <title>{entry.type === "pass" ? "Pass into box" : "Carry into box"}</title>
            </circle>
          </g>
        );
      })}
    </PitchSVG>
  );
}

