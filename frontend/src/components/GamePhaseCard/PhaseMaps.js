import React, { useState } from "react";
import styles from "../MatchViz/MatchViz.module.css";

// A 120 x 80 pitch drawn as SVG. `highlightAttack` shades the box the team is attacking.
export function Pitch({ highlightAttack = false, children, defs, onBackgroundClick, onMouseLeave }) {
  return (
    <svg viewBox="0 0 120 80" className={styles.shotMapSvg} onClick={onBackgroundClick} onMouseLeave={onMouseLeave}>
      {defs}
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

const tipLines = ev => {
  if (ev.event_type === "defensive_error") {
    const f = ev.follow_up && ev.follow_up.shot_id ? ev.follow_up : null;
    return [
      ev.player,
      `Defensive error: ${ev.error_type}${ev.when ? ` (${ev.when})` : ""}`,
      f
        ? `${f.goal ? "LED TO A GOAL" : "Led to a shot"}: ${f.shot_player}, ${f.delay}s later (xG ${f.xg ?? "?"}, ${f.outcome || "no outcome"})`
        : "No opposition shot in the next 30s",
    ];
  }
  if (ev.event_type === "red_card") return [ev.player, "Red card"];
  if (ev.event_type === "own_goal") return [ev.player, "Own goal"];
  return [ev.player, `Shot${ev.when ? ` (${ev.when})` : ""}`, `xG ${ev.xg} - ${ev.outcome}`];
};

// The id of what a click should open: a shot itself, or the shot a mistake led to
const clickTarget = ev => (ev.event_type === "shot" ? ev.id : ev.follow_up && ev.follow_up.shot_id) || null;

export function EventMap({ events = [], selectedId, onSelect }) {
  const [tip, setTip] = useState(null);
  const show = (e, ev) => {
    const box = e.currentTarget.ownerSVGElement.getBoundingClientRect();
    setTip({ left: e.clientX - box.left + 14, top: e.clientY - box.top + 14, lines: tipLines(ev) });
  };
  return (
    <div style={{ position: "relative" }}>
      <Pitch onMouseLeave={() => setTip(null)}>
        {events.map((event, i) => {
          const cx = event.x;
          const cy = 80 - event.y;
          const target = clickTarget(event);
          const selected = target && target === selectedId;
          const handlers = {
            onMouseMove: e => show(e, event),
            onMouseLeave: () => setTip(null),
            onClick: target && onSelect ? () => onSelect(target) : undefined,
            style: { cursor: target && onSelect ? "pointer" : "default" },
          };
          const ring = selected && <circle cx={cx} cy={cy} r={shotRadius(event.xg) + 2.2} fill="none" stroke="#1565c0" strokeWidth="1.2" />;
          if (event.event_type === "red_card") {
            return (
              <g key={i} {...handlers}>
                <rect x={cx - 2.5} y={cy - 2.5} width="5" height="5" fill={event.color} stroke="black" strokeWidth="0.5" opacity="0.9" />
              </g>
            );
          }
          if (event.event_type === "defensive_error") {
            const led = event.follow_up && event.follow_up.goal;
            return (
              <g key={i} {...handlers}>
                {selected && <circle cx={cx} cy={cy} r="5" fill="none" stroke="#1565c0" strokeWidth="1.2" />}
                <polygon
                  points={`${cx},${cy - 3.6} ${cx + 3.4},${cy + 2.6} ${cx - 3.4},${cy + 2.6}`}
                  fill={event.color} stroke="black" strokeWidth={led ? 1.5 : 0.5} opacity="0.95"
                />
              </g>
            );
          }
          if (event.event_type === "own_goal") {
            return (
              <g key={i} {...handlers}>
                <line x1={cx - 3} y1={cy - 3} x2={cx + 3} y2={cy + 3} stroke={event.color} strokeWidth="1.5" />
                <line x1={cx - 3} y1={cy + 3} x2={cx + 3} y2={cy - 3} stroke={event.color} strokeWidth="1.5" />
              </g>
            );
          }
          const outcome = String(event.outcome || "").toLowerCase();
          const r = shotRadius(event.xg);
          const k = r * 0.7; // half-size of the little marks drawn on top of a dot
          return (
            <g key={i} {...handlers}>
              {ring}
              <circle cx={cx} cy={cy} r={r} fill={event.color} stroke="black" strokeWidth="0.3" opacity="0.85" />
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
      {tip && (
        <div className={styles.eventTip} style={{ left: tip.left, top: tip.top }}>
          {tip.lines.map((l, i) => <div key={i} className={i === 0 ? styles.eventTipHead : undefined}>{l}</div>)}
        </div>
      )}
    </div>
  );
}

export function BoxEntryMap({ entries = [] }) {
  return (
    <Pitch highlightAttack>
      {entries.map((entry, i) => {
        const gained = entry.type === "gain"; // got the ball in the box without a pass or carry doing it
        const base = gained ? "#9C27B0" : entry.type === "pass" ? "#2196F3" : "#FF9800";
        const color = entry.color || base;
        return (
          <g key={i}>
            {!gained && (
              <line
                x1={entry.x1} y1={80 - entry.y1} x2={entry.x2} y2={80 - entry.y2}
                stroke={color} strokeWidth="1.5" strokeDasharray={entry.type === "pass" ? "2,2" : "0"} opacity="0.7"
              />
            )}
            {gained ? (
              <rect
                x={entry.x2 - 2.2} y={80 - entry.y2 - 2.2} width="4.4" height="4.4"
                transform={`rotate(45 ${entry.x2} ${80 - entry.y2})`}
                fill={color} stroke="black" strokeWidth="0.4" opacity="0.9"
              >
                <title>Ball won in the box (no pass or carry into it)</title>
              </rect>
            ) : (
              <circle cx={entry.x2} cy={80 - entry.y2} r="2" fill={color} stroke="black" strokeWidth="0.3" opacity="0.75">
                <title>{entry.type === "pass" ? "Pass into box" : "Carry into box"}</title>
              </circle>
            )}
          </g>
        );
      })}
    </Pitch>
  );
}
