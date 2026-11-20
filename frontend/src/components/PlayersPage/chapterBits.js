import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import PlotChart, { chartColors } from "./PlotChart";
import styles from "./PlayersPage.module.css";

export const pct = (v, d = 0) => `${(v * 100).toFixed(d)}%`;
export const num = n => Number(n).toLocaleString("en-GB");

/** A calculation shown as big numbers joined by small words: [12, "of", 340, "=", "3.5%"]. */
export function Sum({ parts }) {
  return (
    <div className={styles.sum}>
      {parts.map((p, i) => (i % 2 === 0
        ? <div key={i} className={styles.sumNum}>{p}</div>
        : <div key={i} className={styles.sumOp}>{p}</div>))}
    </div>
  );
}

/** How a row's value is made. Share rows: k of n. Per-90 rows: count in minutes. Otherwise nothing (the page gives a sentence). */
export function Arithmetic({ row, player }) {
  const { v, n } = row;
  if (v == null) {
    // unranked share rows have no stored exact value: use the card's own displayed percentage
    if (row.val.endsWith("%") && n != null) {
      const shown = parseFloat(row.val) / 100;
      return <Sum parts={[num(Math.round(shown * n)), "of", num(n), "=", row.val]} />;
    }
    return null;
  }
  if (row.val.endsWith("%") && n != null) {
    return <Sum parts={[num(Math.round(v * n)), "of", num(n), "=", pct(v, 1)]} />;
  }
  if (/per 90/.test(row.label) || row.section === "Standard stats") {
    const count = row.section === "Standard stats" ? Number(row.val) : (n ?? Math.round((v * player.minutes) / 90));
    // standard stats show a count on the card, so the rate is the stored value; other rows already show the rate
    const rate = row.section === "Standard stats" ? v.toFixed(2) : row.val;
    return <Sum parts={[num(count), "in", num(Math.round(player.minutes)), "minutes =", `${rate} per 90`]} />;
  }
  return null;
}

/** The ranking arithmetic and a strip of the peers. Filled dots: peers he beats. Open: level or ahead. */
export function RankBlock({ row, player, group }) {
  const { isDark } = useTheme();
  const c = chartColors(isDark);
  const first = player.name.split(" ")[0];
  const r = row.rank;

  if (!r) {
    return (
      <p className={styles.explain}>
        <b>Not ranked.</b> {row.n != null ? `Only ${row.n} events: ` : ""}too few for a fair comparison with other {group}.
      </p>
    );
  }
  const inv = row.lower_is_better;
  const lab = inv ? ["worse than him (higher)", "level", "better than him (lower)"] : ["below him", "level", "above him"];
  const v = row.v;
  const beaten = row.peer_values.filter(x => (inv ? x > v : x < v));
  const level = row.peer_values.filter(x => x === v);
  const ahead = row.peer_values.filter(x => (inv ? x < v : x > v));
  const fmt = row.val.endsWith("%") ? ".0%" : "";
  const dot = (xs, open, name) => ({
    x: xs, y: xs.map((_, i) => ((i * 7) % 11) / 11), type: "scatter", mode: "markers", name,
    marker: { size: 8, symbol: open ? "circle-open" : "circle", color: c.text, opacity: open ? 0.7 : 0.95, line: { width: open ? 1.5 : 0, color: c.text } },
    hovertemplate: `${name}: %{x}<extra></extra>`,
  });
  const traces = [dot(beaten, false, "beaten"), dot(ahead, true, "ahead"), dot(level, true, "level"),
    { x: [v], y: [0.5], type: "scatter", mode: "markers", name: first, marker: { size: 16, color: c.fast, line: { color: c.text, width: 1.5 } }, hovertemplate: `${first}: %{x}<extra></extra>` }];

  return (
    <div>
      <p className={styles.explain}>
        Rank among {r.pool_size} {group}: {r.below} {lab[0]}, {r.equal} {lab[1]}, {r.above} {lab[2]}.
        {" "}({r.below} + ½ × {r.equal}) ÷ {r.pool_size} = {r.exact.toFixed(1)}%, so <b>{row.percentile}</b>.
        {!row.settled && <> <b>Not settled:</b> needs {row.need} matches for this row; he has played {player.matches}.</>}
      </p>
      <PlotChart data={traces} height={120} layout={{
        xaxis: { gridcolor: c.grid, tickformat: fmt || undefined }, yaxis: { visible: false, range: [-0.2, 1.2] }, showlegend: false,
        margin: { l: 16, r: 16, t: 6, b: 30 },
        shapes: row.peer_median == null ? [] : [{ type: "line", x0: row.peer_median, x1: row.peer_median, y0: -0.1, y1: 1.1, line: { color: c.text, width: 1, dash: "dash" } }],
      }} />
      <div className={styles.caption}>
        One dot per {group.slice(0, -1)}. Filled: {inv ? "worse than" : "lower than"} {first}. Open: level or {inv ? "better" : "higher"}. Dashed: the group's median.
        {row.range && <> 90% range for {first}: {row.range}.</>}
      </div>
    </div>
  );
}
