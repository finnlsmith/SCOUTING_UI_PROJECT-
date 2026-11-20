import React from "react";
import useApi from "../hooks/useApi";
import { useTheme } from "../../contexts/ThemeContext";
import PlotChart, { chartColors, pitchShapes } from "./PlotChart";
import styles from "./PlayersPage.module.css";

const PERIOD_START_MIN = { 1: 0, 2: 45, 3: 90, 4: 105 };
const mmss = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** "1. How you see pace in the data": one real stretch of tracking, step by step. */
export default function PaceDemo() {
  const { data, loading, error } = useApi("/players/pace/demo");
  const { isDark } = useTheme();
  const c = chartColors(isDark);

  if (loading) return <p className={styles.muted}>Loading the example…</p>;
  if (error || !data) return <p className={styles.error}>Could not load the example ({error}).</p>;

  const { meta, trace, actions } = data;
  const fast = meta.fast_kmh;
  const clockStart = mmss(meta.window_start_s + 60 * (PERIOD_START_MIN[meta.period] || 0));
  const known = actions.filter(a => a.usable);
  const unknown = actions.filter(a => !a.usable);
  const colorOf = a => (a.speed_kmh >= fast ? c.fast : c.slow);

  const speedLine = [
    {
      x: trace.map(r => r.t), y: trace.map(r => (r.pff_speed == null ? null : r.pff_speed * 3.6)),
      type: "scatter", mode: "lines", name: "PFF's own speed field",
      line: { color: c.peer, width: 1, dash: "dot" }, hovertemplate: "PFF's own: %{y:.1f} km/h<extra></extra>",
    },
    {
      x: trace.map(r => r.t), y: trace.map(r => r.speed_kmh), type: "scatter", mode: "lines",
      name: "Speed from positions", line: { color: c.text, width: 2 },
      hovertemplate: "%{x:.1f} s · %{y:.1f} km/h<extra></extra>",
    },
    {
      x: known.map(a => a.t), y: known.map(a => a.speed_kmh), type: "scatter", mode: "markers+text",
      name: "Action with a usable speed", text: known.map(a => a.action), textposition: "top center",
      marker: { size: 12, color: known.map(colorOf), line: { color: c.text, width: 1 } },
      hovertemplate: "%{text} at %{y:.1f} km/h<extra></extra>",
    },
    {
      x: unknown.map(a => a.t), y: unknown.map(() => 0), type: "scatter", mode: "markers+text",
      name: "Action, speed unknown", text: unknown.map(a => a.action), textposition: "top center",
      marker: { size: 12, symbol: "x-open", color: c.text },
      hovertemplate: "%{text}: no usable speed<extra></extra>",
    },
  ];
  const speedLayout = {
    xaxis: { title: "seconds into this stretch", gridcolor: c.grid, zeroline: false },
    yaxis: { title: "km/h", gridcolor: c.grid, zeroline: false, rangemode: "tozero" },
    shapes: [{ type: "line", xref: "paper", x0: 0, x1: 1, y0: fast, y1: fast, line: { color: c.fast, width: 1.5, dash: "dash" } }],
    annotations: [{ xref: "paper", x: 1, y: fast, text: `${fast} km/h`, showarrow: false, xanchor: "right", yanchor: "bottom", font: { color: c.fast } }],
    legend: { orientation: "h", y: -0.28 },
    margin: { l: 52, r: 16, t: 12, b: 80 },
  };

  const path = [
    {
      x: trace.map(r => r.x), y: trace.map(r => r.y), type: "scattergl", mode: "markers", name: "position",
      marker: { size: 4, color: trace.map(r => (r.speed_kmh == null ? c.peer : r.speed_kmh >= fast ? c.fast : c.slow)) },
      hoverinfo: "skip",
    },
    {
      x: actions.map(a => a.x), y: actions.map(a => a.y), type: "scatter", mode: "markers+text", name: "action",
      text: actions.map(a => a.action), textposition: "top center",
      marker: { size: 12, color: actions.map(a => (a.usable ? colorOf(a) : "rgba(0,0,0,0)")), line: { color: c.text, width: 1.5 } },
      hovertemplate: "%{text}<extra></extra>",
    },
  ];
  const pathLayout = {
    xaxis: { range: [-56, 56], visible: false, scaleanchor: "y" },
    yaxis: { range: [-37, 37], visible: false },
    shapes: pitchShapes(c.line), showlegend: false, margin: { l: 4, r: 4, t: 4, b: 4 },
  };

  return (
    <div>
      <ol className={styles.steps}>
        <li><b>Tracking.</b> PFF logs every player's x and y about 15 times a second.</li>
        <li><b>Speed.</b> Distance moved per second, after smoothing jitter and dropping impossible readings. The black line.</li>
        <li><b>Action.</b> Each pass, cross, shot, dribble, carry and first touch has a time. Read his speed at that moment. The dot.</li>
        <li><b>Rule.</b> {fast} km/h or faster counts as "at pace". The card shows the share of his actions that do.</li>
      </ol>

      <p className={styles.demoWho}>
        <b>{meta.player}</b>, {meta.match}: {meta.n_actions} actions in the 75 seconds from {clockStart}. Top speed {meta.top_speed_kmh.toFixed(1)} km/h.
      </p>

      <div className={styles.twoCol}>
        <figure className={styles.figure}>
          <PlotChart data={speedLine} layout={speedLayout} height={360} />
          <figcaption className={styles.caption}>
            Black: speed from positions. Dotted: PFF's own speed (only some matches have it); the two agree closely.
            Dot: an action, <span style={{ color: c.fast }}>blue</span> at 15+ km/h, grey below. ✕: no usable speed, so left out.
          </figcaption>
        </figure>
        <figure className={styles.figure}>
          <PlotChart data={path} layout={pathLayout} height={360} />
          <figcaption className={styles.caption}>
            The same 75 seconds on the pitch, attacking left to right. Blue: 15+ km/h. Big dots: his actions.
          </figcaption>
        </figure>
      </div>
      <p className={styles.muted}>Stretch picked automatically: most actions, with a 25+ km/h burst.</p>
    </div>
  );
}
