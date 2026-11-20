import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import PlotChart, { chartColors } from "./PlotChart";
import styles from "./PlayersPage.module.css";

const pct = (v, d = 0) => `${(v * 100).toFixed(d)}%`;
const num = n => Number(n).toLocaleString("en-GB");
const KIND = { pass: "Passes", "first touch": "First touches", carry: "Carries", dribble: "Dribbles", cross: "Crosses", shot: "Shots" };

/** "3. Why he gets this number". */
export function PaceWhyValue({ pace }) {
  const { isDark } = useTheme();
  const c = chartColors(isDark);
  const p = pace.player;
  const first = p.name.split(" ")[0];
  const group = pace.peer_group.name === "Midfielders" ? "midfielders" : "attackers";
  const main = pace.by_action.filter(a => a.n >= 20 && a.peer_n >= 20);
  const mix = pace.mix_check;
  const matchesSorted = [...pace.by_match];
  const bins = pace.speed_bins;
  const fastCounts = bins.filter(b => b.fast).map(b => b.count);
  const of = k => main.find(a => a.action === k);

  const hist = [{
    x: bins.map(b => (b.to >= 50 ? `${b.from}+` : `${b.from}–${b.to}`)), y: bins.map(b => b.count), type: "bar",
    text: bins.map(b => b.count), textposition: "outside", cliponaxis: false,
    marker: { color: bins.map(b => (b.fast ? c.fast : c.slow)) },
    hovertemplate: "%{x} km/h: %{y} actions<extra></extra>",
  }];
  const kinds = [{
    x: main.map(a => KIND[a.action] || a.action), y: main.map(a => a.fast_share), type: "bar", name: first,
    marker: { color: c.fast }, text: main.map(a => pct(a.fast_share)), textposition: "outside", cliponaxis: false,
    hovertemplate: `${first}: %{y:.0%} at pace<extra></extra>`,
  }, {
    x: main.map(a => KIND[a.action] || a.action), y: main.map(a => a.peer_fast_share), type: "bar", name: `the ${pace.peer_group.size} ${group}`,
    marker: { color: c.slow }, text: main.map(a => pct(a.peer_fast_share)), textposition: "outside", cliponaxis: false,
    hovertemplate: "Peers: %{y:.0%} at pace<extra></extra>",
  }];
  const matches = [{
    x: matchesSorted.map(m => m.match.replace(" v ", " – ")), y: matchesSorted.map(m => m.share), type: "bar",
    marker: { color: c.fast }, text: matchesSorted.map(m => `${pct(m.share)}<br>${m.n} actions`), textposition: "outside", cliponaxis: false,
    hovertemplate: "%{x}: %{y:.1%}<extra></extra>",
  }];

  return (
    <div>
      <div className={styles.sum}>
        <div className={styles.sumNum}>{p.act_fast}</div><div className={styles.sumOp}>of</div>
        <div className={styles.sumNum}>{num(p.act_n)}</div><div className={styles.sumOp}>=</div>
        <div className={styles.sumNum}>{pct(p.pace_share, 1)}</div>
      </div>
      <p className={styles.explain}>
        Each action goes in a bar by his speed. The blue bars (15+ km/h): {fastCounts.join(" + ")} = <b>{p.act_fast}</b>. {p.act_fast} ÷ {num(p.act_n)} = {pct(p.pace_share, 1)}.
      </p>
      <figure className={styles.figure}>
        <PlotChart data={hist} height={300} layout={{
          xaxis: { title: "his speed when he acted (km/h)", gridcolor: c.grid }, yaxis: { title: "actions", gridcolor: c.grid, zeroline: false }, bargap: 0.1, margin: { l: 52, r: 16, t: 24, b: 48 },
        }} />
        <figcaption className={styles.caption}>All {num(p.act_n)} actions with a usable speed. Blue: counted as at pace.</figcaption>
      </figure>

      <h3 className={styles.h3}>Why is it low?</h3>
      <p className={styles.explain}>
        Not because of what he does. Carries and dribbles are fast; passes and first touches are slow. But his mix matches the {group}':
        {" "}{main.map(a => `${pct(a.mix)} ${(KIND[a.action] || a.action).toLowerCase()} (peers ${pct(a.peer_mix)})`).join(", ")}.
      </p>
      <p className={styles.explain}>
        Test: his speeds on the {group}' mix give <b>{pct(mix.his_speed_peer_mix, 1)}</b> (his real: {pct(p.pace_share, 1)}). Their speeds on his mix give <b>{pct(mix.peer_speed_his_mix, 1)}</b>.
        The gap is <b>speed</b>: he is slower when he does the same things.
      </p>
      <figure className={styles.figure}>
        <PlotChart data={kinds} height={320} layout={{
          barmode: "group", xaxis: { gridcolor: c.grid }, yaxis: { title: "share at 15+ km/h", tickformat: ".0%", gridcolor: c.grid, zeroline: false, rangemode: "tozero" },
          legend: { orientation: "h", y: 1.12 }, margin: { l: 64, r: 16, t: 36, b: 40 },
        }} />
        <figcaption className={styles.caption}>
          Share at pace by kind of action, {first} against the {pace.peer_group.size} {group} on the card.
          Passes {pct(of("pass")?.fast_share ?? 0)} vs {pct(of("pass")?.peer_fast_share ?? 0)}; first touches {pct(of("first touch")?.fast_share ?? 0)} vs {pct(of("first touch")?.peer_fast_share ?? 0)}.
          Other actions left out: he has only a handful.
        </figcaption>
      </figure>

      <h3 className={styles.h3}>Is it one match?</h3>
      <figure className={styles.figure}>
        <PlotChart data={matches} height={300} layout={{
          xaxis: { gridcolor: c.grid, tickangle: -20 }, yaxis: { title: "share at 15+ km/h", tickformat: ".0%", gridcolor: c.grid, zeroline: false, rangemode: "tozero" },
          margin: { l: 64, r: 16, t: 40, b: 90 },
        }} />
        <figcaption className={styles.caption}>
          {pct(Math.min(...matchesSorted.map(m => m.share)))} to {pct(Math.max(...matchesSorted.map(m => m.share)))} across his {matchesSorted.length} matches. Matches with fewer actions swing more.
        </figcaption>
      </figure>
      <p className={styles.caution}>
        <b>Can't tell:</b> why he is slower (his role, team style, the opponent), or how fast he was on the {pace.actions_unknown_speed} actions with no usable speed.
      </p>
    </div>
  );
}

/** "4. Why the Nth percentile". */
export function PaceWhyPercentile({ pace }) {
  const { isDark } = useTheme();
  const c = chartColors(isDark);
  const p = pace.player;
  const pg = pace.peer_group;
  const first = p.name.split(" ")[0];
  const group = pg.name === "Midfielders" ? "midfielders" : "attackers";
  const above = pg.size - pg.below - pg.equal;
  const exact = (100 * (pg.below + 0.5 * pg.equal)) / pg.size;
  const sortedShares = pg.shares;
  const lower = sortedShares.filter(v => v < p.pace_share);
  const higher = sortedShares.filter(v => v > p.pace_share);
  const q = f => sortedShares[Math.min(sortedShares.length - 1, Math.floor(f * sortedShares.length))];
  // filled dots = smaller share than him, open dots = bigger share (shape, not colour, so it does not read as good or bad)
  const dot = (xs, open, name) => ({
    x: xs, y: xs.map((_, i) => ((i * 7) % 11) / 11), type: "scatter", mode: "markers", name,
    marker: { size: 9, symbol: open ? "circle-open" : "circle", color: c.text, opacity: open ? 0.7 : 0.95, line: { width: open ? 1.5 : 0, color: c.text } },
    hovertemplate: `${name}: %{x:.1%}<extra></extra>`,
  });
  const strip = [
    dot(lower, false, `${group} with a smaller share`),
    dot(higher, true, `${group} with a bigger share`),
    { x: [p.pace_share], y: [0.5], type: "scatter", mode: "markers+text", name: first, text: [first], textposition: "top center",
      marker: { size: 18, color: c.fast, line: { color: c.text, width: 1.5 } }, hovertemplate: `${first}: %{x:.1%}<extra></extra>` },
  ];

  return (
    <div>
      <p className={styles.explain}>
        Rank the {pg.size} {group} (3+ matches, 200+ minutes, 50+ actions) by pace share. Count those below him; level players count half.
      </p>
      <div className={styles.sum}>
        <div className={styles.sumNum}>{pg.below}</div><div className={styles.sumOp}>below</div>
        <div className={styles.sumNum}>{pg.equal}</div><div className={styles.sumOp}>level</div>
        <div className={styles.sumNum}>{above}</div><div className={styles.sumOp}>above</div>
      </div>
      <p className={styles.explain}>
        ({pg.below} + ½ × {pg.equal}) ÷ {pg.size} = {exact.toFixed(1)}%, so <b>{p.percentile}</b>. That is the box on his card.
      </p>
      <figure className={styles.figure}>
        <PlotChart data={strip} height={210} layout={{
          xaxis: { title: "share at 15+ km/h", tickformat: ".0%", gridcolor: c.grid, rangemode: "tozero" }, yaxis: { visible: false, range: [-0.15, 1.2] },
          shapes: pg.median_share == null ? [] : [{ type: "line", x0: pg.median_share, x1: pg.median_share, y0: -0.1, y1: 1.1, line: { color: c.text, width: 1.5, dash: "dash" } }],
          annotations: pg.median_share == null ? [] : [{ x: pg.median_share, y: 1.12, text: `median ${pct(pg.median_share, 1)}`, showarrow: false, yanchor: "bottom", font: { color: c.text } }],
          legend: { orientation: "h", y: -0.5 }, margin: { l: 16, r: 16, t: 28, b: 100 },
        }} />
        <figcaption className={styles.caption}>
          One dot per {group.slice(0, -1)} (vertical spread only avoids overlap). Filled: smaller share than {first}. Open: bigger.
        </figcaption>
      </figure>
      <p className={styles.explain}>
        <b>Why a small gap ranks low:</b> he is {((pg.median_share - p.pace_share) * 100).toFixed(1)} points under the median, but the middle 80% span only {pct(q(0.1))} to {pct(q(0.9))}.
        A percentile shows rank, not gap size, so the card shows the value too.
      </p>
    </div>
  );
}
