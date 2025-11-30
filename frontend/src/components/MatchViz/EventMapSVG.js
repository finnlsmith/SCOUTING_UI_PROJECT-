import React from "react";
import PitchSVG from "./PitchSVG";

/**
 * Component for rendering events (shots, cards, own goals) on a pitch
 */
export default function EventMapSVG({ events = [], flip = false, className = "" }) {
  const renderEvent = (event, eventIdx) => {
    const x = flip ? 120 - event.x : event.x;
    const y = 80 - event.y;

    if (event.event_type === "red_card") {
      return (
        <rect
          key={eventIdx}
          x={x - 2.5}
          y={y - 2.5}
          width="5"
          height="5"
          fill={event.color}
          stroke="black"
          strokeWidth="0.5"
          opacity="0.9"
        >
          <title>{`${event.player}\nRed Card`}</title>
        </rect>
      );
    } else if (event.event_type === "own_goal") {
      return (
        <g key={eventIdx}>
          <line
            x1={x - 3}
            y1={y - 3}
            x2={x + 3}
            y2={y + 3}
            stroke={event.color}
            strokeWidth="1.5"
          />
          <line
            x1={x - 3}
            y1={y + 3}
            x2={x + 3}
            y2={y - 3}
            stroke={event.color}
            strokeWidth="1.5"
          />
          <title>{`${event.player}\nOwn Goal For`}</title>
        </g>
      );
    } else {
      // Shot event
      const isBlocked = event.outcome === "Blocked";
      const isOffTarget = event.outcome === "Off T" || event.outcome === "Wayward";

      return (
        <g key={eventIdx}>
          <circle
            cx={x}
            cy={y}
            r="2.5"
            fill={event.color}
            stroke="black"
            strokeWidth="0.3"
            opacity="0.85"
          >
            <title>{`${event.player}\nxG: ${event.xg}\n${event.outcome}`}</title>
          </circle>

          {/* Red X for blocked shots */}
          {isBlocked && (
            <>
              <line x1={x - 2} y1={y - 2} x2={x + 2} y2={y + 2} stroke="red" strokeWidth="1" />
              <line x1={x - 2} y1={y + 2} x2={x + 2} y2={y - 2} stroke="red" strokeWidth="1" />
            </>
          )}

          {/* Red unfilled circle for off target shots */}
          {isOffTarget && (
            <circle cx={x} cy={y} r="4" fill="none" stroke="red" strokeWidth="0.8" />
          )}
        </g>
      );
    }
  };

  return (
    <PitchSVG className={className}>
      {events.map((event, idx) => renderEvent(event, idx))}
    </PitchSVG>
  );
}

