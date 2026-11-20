import React, { useEffect, useState } from "react";
import { Pitch } from "../GamePhaseCard/PhaseMaps";
import { fetchTouches } from "../hooks/matchApi";
import styles from "../SequenceMap/SequenceMap.module.css";

// Where one player had the ball, with a dropdown to switch between all touches and just their
// receptions in the final third. Works for the whole match or a window (a phase).
const clock = (m, s) => (m == null ? "" : `${m}:${String(s ?? 0).padStart(2, "0")}`);
const COLORS = { Pass: "#1565c0", Carry: "#ef6c00", "Ball Receipt*": "#2e7d32", Shot: "#c62828", Dribble: "#6a1b9a" };

export default function TouchesMap({ filename, team, player, short, window, onClose }) {
  const [mode, setMode] = useState("touches");
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [tip, setTip] = useState(null);
  const windowKey = window ? `${window.period}:${window.start}:${window.end}` : "";

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(false);
    fetchTouches(filename, team, player, mode, window)
      .then(d => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filename, team, player, mode, windowKey]);

  const showTip = (e, lines) => {
    if (!lines) return setTip(null);
    const box = e.currentTarget.ownerSVGElement.getBoundingClientRect();
    setTip({ left: e.clientX - box.left + 12, top: e.clientY - box.top + 12, lines });
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.title}>{short || player}: {mode === "touches" ? "touches" : "final third receptions"}{data ? ` (${data.count})` : ""}</div>
        <div style={{ display: "flex", gap: "8px" }}>
          <select className={styles.close} value={mode} onChange={e => setMode(e.target.value)} aria-label="What to show">
            <option value="touches">Touches</option>
            <option value="final_third_receptions">Final third receptions</option>
          </select>
          <button type="button" className={styles.close} onClick={onClose}>Back</button>
        </div>
      </div>
      <div className={styles.frame}>
        <Pitch onMouseLeave={() => setTip(null)}>
          {(data?.points || []).map((p, i) => (
            <circle
              key={i} cx={p.x} cy={p.y} r="1.7" fill={COLORS[p.type] || "#555"} stroke="white" strokeWidth="0.3" opacity="0.85"
              onMouseMove={e => showTip(e, [p.type.replace("*", ""), clock(p.minute, p.second)])}
              onMouseLeave={() => setTip(null)}
            />
          ))}
        </Pitch>
        {tip && (
          <div className={styles.tip} style={{ left: tip.left, top: tip.top }}>
            {tip.lines.map((l, i) => <div key={i} className={i === 0 ? styles.tipHead : undefined}>{l}</div>)}
          </div>
        )}
      </div>
      <div className={styles.key}>
        {error ? <span>Could not load touches.</span> : !data ? <span>Loading...</span> : data.count === 0 ? <span>No touches in this view.</span> : (
          Object.entries(COLORS).map(([t, c]) => (
            <span key={t}><i className={styles.dotOwn} style={{ background: c }} /> {t.replace("*", "")}</span>
          ))
        )}
        <span>{team} attack to the right</span>
      </div>
    </div>
  );
}
