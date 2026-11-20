import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import PlotChart, { chartColors } from "./PlotChart";
import styles from "./PlayersPage.module.css";

const pct = (v, d = 0) => `${(v * 100).toFixed(d)}%`;
const num = n => Number(n).toLocaleString("en-GB");

/** k of n = value. */
function Sum({ k, n, value }) {
  return (
    <div className={styles.sum}>
      <div className={styles.sumNum}>{num(k)}</div><div className={styles.sumOp}>of</div>
      <div className={styles.sumNum}>{num(n)}</div><div className={styles.sumOp}>=</div>
      <div className={styles.sumNum}>{pct(value, 1)}</div>
    </div>
  );
}

/** The ranking arithmetic and a strip of the peers: filled dots below him, open dots above. */
function Rank({ row, group, first, c, matches }) {
  const above = row.pool_size - row.below - row.equal;
  const exact = (100 * (row.below + 0.5 * row.equal)) / row.pool_size;
  const v = row.value;
  const lower = row.peer_shares.filter(x => x < v), higher = row.peer_shares.filter(x => x > v), level = row.peer_shares.filter(x => x === v);
  const dot = (xs, open, name) => ({
    x: xs, y: xs.map((_, i) => ((i * 7) % 11) / 11), type: "scatter", mode: "markers", name,
    marker: { size: 8, symbol: open ? "circle-open" : "circle", color: c.text, opacity: open ? 0.7 : 0.95, line: { width: open ? 1.5 : 0, color: c.text } },
    hovertemplate: `${name}: %{x:.1%}<extra></extra>`,
  });
  const traces = [dot(lower, false, "lower"), dot(higher, true, "higher"), dot(level, true, "level with him"),
    { x: [v], y: [0.5], type: "scatter", mode: "markers", name: first, marker: { size: 16, color: c.fast, line: { color: c.text, width: 1.5 } }, hovertemplate: `${first}: %{x:.1%}<extra></extra>` }];
  return (
    <div>
      <p className={styles.explain}>
        Rank among {row.pool_size} {group}: {row.below} below, {row.equal} level, {above} above. ({row.below} + ½ × {row.equal}) ÷ {row.pool_size} = {exact.toFixed(1)}%, so <b>{row.percentile}</b>.
        {!row.settled && <> <b>Not settled:</b> needs {row.need} matches for this row; he has played {matches}.</>}
      </p>
      <PlotChart data={traces} height={120} layout={{
        xaxis: { tickformat: ".0%", gridcolor: c.grid }, yaxis: { visible: false, range: [-0.2, 1.2] }, showlegend: false,
        margin: { l: 16, r: 16, t: 6, b: 30 },
        shapes: row.peer_median == null ? [] : [{ type: "line", x0: row.peer_median, x1: row.peer_median, y0: -0.1, y1: 1.1, line: { color: c.text, width: 1, dash: "dash" } }],
      }} />
      <div className={styles.caption}>One dot per {group.slice(0, -1)}. Filled: lower than {first}. Open: higher or level. Dashed: median {pct(row.peer_median, 1)}. 90% range for {first}: {pct(row.range[0])} to {pct(row.range[1])}.</div>
    </div>
  );
}

const grouped = (groups, f, peerF, names, c, fmt) => [
  { x: groups.map(g => g.group), y: groups.map(g => f(g)), type: "bar", name: names[0], marker: { color: c.fast },
    text: groups.map(g => fmt(f(g))), textposition: "outside", cliponaxis: false },
  { x: groups.map(g => g.group), y: groups.map(g => peerF(g)), type: "bar", name: names[1], marker: { color: c.slow },
    text: groups.map(g => fmt(peerF(g))), textposition: "outside", cliponaxis: false },
];
const barLayout = (title, c, extra = {}) => ({
  barmode: "group", xaxis: { gridcolor: c.grid }, yaxis: { title, tickformat: ".0%", gridcolor: c.grid, zeroline: false, rangemode: "tozero" },
  legend: { orientation: "h", y: 1.18 }, margin: { l: 64, r: 16, t: 36, b: 40 }, ...extra,
});

/** "3. Why he gets these numbers": one short block per row. */
export default function TechniqueWhy({ tech }) {
  const { isDark } = useTheme();
  const c = chartColors(isDark);
  const first = tech.player.name.split(" ")[0];
  const group = tech.peer_group === "Midfielders" ? "midfielders" : "attackers";
  const R = Object.fromEntries(tech.rows.map(r => [r.key, r]));
  const names = [first, `the ${group}`];
  const ft = tech.first_time_by_pressure, fg = Object.fromEntries(ft.groups.map(g => [g.group, g]));
  const ps = tech.pass_by_speed, psg = Object.fromEntries(ps.groups.map(g => [g.group, g]));
  const pp = tech.pass_by_pressure, ppg = Object.fromEntries(pp.groups.map(g => [g.group, g]));
  const fl = tech.failed;
  const matches = tech.player.matches;
  const ftGap = (R.ft_pass.value - R.ft_pass.peer_median) * 100;

  return (
    <div>
      {/* ---- played first time ---- */}
      <h3 className={styles.h3}>Played first time: {pct(R.one_touch.value)}</h3>
      <Sum k={R.one_touch.k} n={R.one_touch.n} value={R.one_touch.value} />
      <p className={styles.explain}>
        Lower than the {group} ({pct(ft.peer_rate, 1)}), mostly because of pressure. Players mostly play first time when someone is on them:
        {" "}{pct(fg.Pressured.peer_rate)} of pressured receptions against {pct(fg["No pressure"].peer_rate)} of unpressured ones. Only {pct(fg.Pressured.mix)} of {first}'s receptions came under pressure ({group}: {pct(fg.Pressured.peer_mix)}).
        On the {group}' pressure mix he would be at <b>{pct(ft.his_rates_peer_mix, 1)}</b>, against {pct(ft.peer_rate, 1)} for them.
      </p>
      <div className={styles.twoCol}>
        <figure className={styles.figure}>
          <PlotChart data={grouped(ft.groups, g => g.mix, g => g.peer_mix, names, c, v => pct(v))} height={280} layout={barLayout("share of receptions", c)} />
          <figcaption className={styles.caption}>How many receptions come under pressure.</figcaption>
        </figure>
        <figure className={styles.figure}>
          <PlotChart data={grouped(ft.groups, g => g.rate, g => g.peer_rate, names, c, v => pct(v))} height={280} layout={barLayout("played first time", c)} />
          <figcaption className={styles.caption}>How often they play first time, by pressure.</figcaption>
        </figure>
      </div>
      <Rank row={R.one_touch} group={group} first={first} c={c} matches={matches} />

      {/* ---- first touch kept ---- */}
      <h3 className={styles.h3}>First touch kept: {pct(R.kept.value, 1)}</h3>
      <Sum k={R.kept.k} n={R.kept.n} value={R.kept.value} />
      <p className={styles.explain}>
        He had <b>{fl.his_failed} failures</b> in {fl.his_n} receptions. The {group} fail {pct(fl.peer_rate, 1)} of the time, which would be about {fl.expected_at_peer_rate.toFixed(1)} failures over {fl.his_n} receptions.
        Many players finish at 100%, so {R.kept.equal} of the {R.kept.pool_size} are level with him. They share the top, and level players count half in the ranking.
      </p>
      <figure className={styles.figure}>
        <PlotChart data={[{ x: ["At the peers' rate", first], y: [fl.expected_at_peer_rate, fl.his_failed], type: "bar", marker: { color: [c.slow, c.fast] },
          text: [fl.expected_at_peer_rate.toFixed(1), fl.his_failed], textposition: "outside", cliponaxis: false }]} height={200}
          layout={{ yaxis: { title: "failed first touches", gridcolor: c.grid, zeroline: false, rangemode: "tozero" }, margin: { l: 64, r: 16, t: 24, b: 40 } }} />
        <figcaption className={styles.caption}>Failed first touches over {fl.his_n} receptions: what the {group}' rate would give, against {first}'s count.</figcaption>
      </figure>
      <Rank row={R.kept} group={group} first={first} c={c} matches={matches} />

      {/* ---- first-time pass completion ---- */}
      <h3 className={styles.h3}>First-time pass completion: {pct(R.ft_pass.value)}</h3>
      <Sum k={R.ft_pass.k} n={R.ft_pass.n} value={R.ft_pass.value} />
      <p className={styles.explain}>
        {R.ft_pass.n - R.ft_pass.k} of his {R.ft_pass.n} first-time passes missed. The {group}' median is {pct(R.ft_pass.peer_median, 1)}, {Math.abs(ftGap).toFixed(1)} points {ftGap < 0 ? "above" : "below"} him.
        With only {R.ft_pass.n} passes the 90% range is wide ({pct(R.ft_pass.range[0])} to {pct(R.ft_pass.range[1])}), which is why the row is not settled.
      </p>
      <Rank row={R.ft_pass} group={group} first={first} c={c} matches={matches} />

      {/* ---- pass completion ---- */}
      <h3 className={styles.h3}>Pass completion: {pct(R.pass.value, 1)}</h3>
      <Sum k={R.pass.k} n={R.pass.n} value={R.pass.value} />
      <p className={styles.explain}>
        {pct(R.pass.value, 1)} against {pct(pp.peer_rate, 1)} for the {group}. {first} passes under less pressure than they do ({pct(ppg["No pressure"].mix)} of his passes have none, {group}: {pct(ppg["No pressure"].peer_mix)}), which makes passing easier.
        On the {group}' pressure mix he would be at <b>{pct(pp.his_rates_peer_mix, 1)}</b>. Unpressured he completes {pct(ppg["No pressure"].rate, 1)} ({group}: {pct(ppg["No pressure"].peer_rate, 1)});
        pressured {pct(ppg.Pressured.rate)} ({group}: {pct(ppg.Pressured.peer_rate)}, only {ppg.Pressured.n} passes for him).
      </p>
      <figure className={styles.figure}>
        <PlotChart data={grouped(pp.groups, g => g.rate, g => g.peer_rate, names, c, v => pct(v))} height={280} layout={barLayout("passes completed", c)} />
        <figcaption className={styles.caption}>Pass completion by pressure on the passer.</figcaption>
      </figure>
      <Rank row={R.pass} group={group} first={first} c={c} matches={matches} />

      {/* ---- pass completion at 15+ ---- */}
      <h3 className={styles.h3}>Pass completion at 15+ km/h: {pct(R.pass_fast.value)}</h3>
      <Sum k={R.pass_fast.k} n={R.pass_fast.n} value={R.pass_fast.value} />
      <p className={styles.explain}>
        The same count, only for passes made while moving at 15 km/h or faster. The {group} complete {pct(psg["15+ km/h"].peer_rate, 1)} of those against {pct(psg["Under 15 km/h"].peer_rate, 1)} of slower passes: speed costs them about a point.{" "}
        {first} shows no cost ({pct(psg["15+ km/h"].rate, 1)} against {pct(psg["Under 15 km/h"].rate, 1)}), but on only {psg["15+ km/h"].n} passes the 90% range is wide ({pct(R.pass_fast.range[0])} to {pct(R.pass_fast.range[1])}).
      </p>
      <figure className={styles.figure}>
        <PlotChart data={grouped([psg["Under 15 km/h"], psg["15+ km/h"]], g => g.rate, g => g.peer_rate, names, c, v => pct(v, 1))} height={280}
          layout={barLayout("passes completed", c, { yaxis: { title: "passes completed", tickformat: ".0%", gridcolor: c.grid, zeroline: false, range: [0.7, 1] } })} />
        <figcaption className={styles.caption}>Pass completion by his speed when he passed.</figcaption>
      </figure>
      <Rank row={R.pass_fast} group={group} first={first} c={c} matches={matches} />

      <p className={styles.caution}>
        <b>Can't tell:</b> why he plays first time less often than peers beyond pressure (role, team style), or whether a low pressure share is his doing or his team's. The pass rows leave out passes whose speed is unknown.
      </p>
    </div>
  );
}
