import React, { useState } from "react";
import { Pitch } from "../GamePhaseCard/PhaseMaps";
import styles from "./SequenceMap.module.css";

// What the lead-up to a shot (or a mistake) looked like: the last few actions, in order, on one pitch.
// Own-team actions are dark, the opposition's are red. Numbers give the order; hover for details.

const clock = (m, s) => (m == null ? "" : `${m}:${String(s ?? 0).padStart(2, "0")}`);
const has = a => a.x1 != null && a.y1 != null;

function Arrow({ a, n, onHover }) {
  const color = a.own_team ? "#222" : "#d32f2f";
  const failed = a.kind === "Pass" && a.outcome && a.outcome !== "Complete";
  const x1 = a.x1, y1 = a.y1, x2 = a.x2 ?? a.x1, y2 = a.y2 ?? a.y1;
  const moves = Math.hypot(x2 - x1, y2 - y1) > 0.5;
  const detail = [
    `${n}. ${a.short || a.player} (${a.own_team ? a.team : a.team})`,
    `${a.label}${a.outcome && a.kind !== "Carry" ? ` - ${a.outcome}` : ""}`,
    clock(a.minute, a.second),
  ].filter(Boolean);
  const dash = a.kind === "Pass" ? "2.2,1.6" : a.kind === "Dribble" ? "4,1.5" : "0";
  return (
    <g onMouseMove={e => onHover(e, detail)} onMouseLeave={() => onHover(null)}>
      {moves && (
        <line
          x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={a.kind === "Carry" ? 1.4 : 1.1}
          strokeDasharray={dash} opacity={failed ? 0.45 : 0.9} markerEnd="url(#seqArrow)"
        />
      )}
      <circle cx={x1} cy={y1} r="1.6" fill={color} opacity="0.9" />
      <text x={x1} y={y1 - 2.4} textAnchor="middle" fontSize="4" fontWeight="bold" fill={color}>{n}</text>
      {moves && (a.kind === "Pass" ? a.label !== "Pass" && a.label !== "Ground Pass" : false) && (
        <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 1.2} textAnchor="middle" fontSize="3.6" fontWeight="bold" fill={color}
              stroke="white" strokeWidth="0.8" paintOrder="stroke">{a.label}</text>
      )}
    </g>
  );
}

export default function SequenceMap({ context, title, onClose, fill = false }) {
  const [tip, setTip] = useState(null);
  if (!context || !context.event) return null;
  const { event, sequence } = context;
  const actions = sequence.filter(a => has(a) && a.kind !== "Shot");
  const showTip = (e, lines) => {
    if (!lines) return setTip(null);
    const box = e.currentTarget.ownerSVGElement.getBoundingClientRect();
    setTip({ left: e.clientX - box.left + 12, top: e.clientY - box.top + 12, lines });
  };

  return (
    <div className={styles.wrap} style={fill ? { maxWidth: "100%" } : undefined}>
      <div className={styles.header}>
        <div className={styles.title}>{title || `Lead-up to ${event.player}'s ${event.type.toLowerCase()}, ${clock(event.minute, event.second)}`}</div>
        {onClose && <button type="button" className={styles.close} onClick={onClose}>Back</button>}
      </div>
      <div className={styles.frame}>
        <Pitch
          defs={(
            <defs>
              <marker id="seqArrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="3" markerHeight="3" orient="auto-start-reverse">
                <path d="M0,0 L6,3 L0,6 z" fill="context-stroke" />
              </marker>
            </defs>
          )}
          onMouseLeave={() => setTip(null)}
        >
          {actions.map((a, i) => <Arrow key={i} a={a} n={i + 1} onHover={showTip} />)}
          {/* The event itself */}
          {event.x != null && (
            <g onMouseMove={e => showTip(e, [`${event.player}`, `${event.type}${event.outcome ? ` - ${event.outcome}` : ""}${event.xg != null ? `, xG ${event.xg}` : ""}`, clock(event.minute, event.second)])}
               onMouseLeave={() => setTip(null)}>
              <circle cx={event.x} cy={event.y} r="3.2" fill={event.outcome === "Goal" ? "#2e7d32" : "#f9a825"} stroke="black" strokeWidth="0.6" />
              <text x={event.x} y={event.y + 1.2} textAnchor="middle" fontSize="3.2" fontWeight="bold" fill="white">{actions.length + 1}</text>
            </g>
          )}
        </Pitch>
        {tip && (
          <div className={styles.tip} style={{ left: tip.left, top: tip.top }}>
            {tip.lines.map((l, i) => <div key={i} className={i === 0 ? styles.tipHead : undefined}>{l}</div>)}
          </div>
        )}
      </div>
      <div className={styles.key}>
        <span><i className={styles.dotOwn} /> {event.team}</span>
        <span><i className={styles.dotOpp} /> Opposition</span>
        <span>Dotted = pass, solid = carry, dashed = take-on, faded = failed pass</span>
      </div>
    </div>
  );
}
