import React from "react";
import useApi from "../hooks/useApi";
import { useTheme } from "../../contexts/ThemeContext";
import { CardFrame, Panel } from "./PlayerCard";
import { chapterById } from "./chapters";
import { CHAPTER_CONTENT } from "./chapterContent";
import { CHAPTER_CODE } from "./chapterCode";
import { Arithmetic, RankBlock, Sum, pct } from "./chapterBits";
import PlotChart, { chartColors, pitchShapes } from "./PlotChart";
import { TryAnother } from "./ChapterPage";
import CodeBlock from "./CodeBlock";
import styles from "./PlayersPage.module.css";

const EXAMPLE_CARD = "kylian_mbappe";
const LABELS = { per90: "Goal-side receptions, per 90", share: "Touches that are goal-side", prog: "Progressive from goal-side touches" };

/** One real moment: the carrier, the nearest outfield opponent and the others, with each one's distance to goal. */
function MomentFigure({ ex, name, c, orange }) {
  const near = ex.opponents[ex.nearest];
  const goal = ex.goal;
  const xMin = Math.min(ex.carrier.x, near.x) - 14, yMid = ex.carrier.y, hh = 26;
  const inView = o => o.x >= xMin && Math.abs(o.y - yMid) <= hh;
  const others = ex.opponents.filter((o, i) => i !== ex.nearest && inView(o));
  const line = (a, b, color) => ({ x: [a.x, b.x], y: [a.y, b.y], type: "scatter", mode: "lines", line: { color, width: 2, dash: "dash" }, hoverinfo: "skip", showlegend: false });
  const traces = [
    line(ex.carrier, { x: goal[0], y: goal[1] }, c.fast),
    line(near, { x: goal[0], y: goal[1] }, orange),
    { x: others.map(o => o.x), y: others.map(o => o.y), type: "scatter", mode: "markers", name: "other opponents", marker: { size: 10, color: orange, opacity: 0.55 }, hoverinfo: "skip" },
    { x: [near.x], y: [near.y], type: "scatter", mode: "markers", name: "nearest opponent", marker: { size: 15, color: orange, line: { color: c.text, width: 2 } }, hoverinfo: "skip" },
    { x: [ex.carrier.x], y: [ex.carrier.y], type: "scatter", mode: "markers", name: name, marker: { size: 17, color: c.fast, line: { color: c.text, width: 2 } }, hoverinfo: "skip" },
    { x: [goal[0]], y: [goal[1]], type: "scatter", mode: "markers", name: "goal", marker: { size: 12, symbol: "square", color: c.text }, hoverinfo: "skip" },
    // each label sits by its own player so the two never overlap, even when the players are close together
    { x: [ex.carrier.x, near.x], y: [ex.carrier.y, near.y], type: "scatter", mode: "text", text: [`${ex.d_goal_carrier} m`, `${ex.d_goal_nearest} m`],
      // the lines to goal run right and down, so put the labels above or below-left of the players, in the clear
      textposition: [ex.carrier.x > near.x ? "top right" : "top left", "bottom left"], textfont: { size: 13, color: c.text }, hoverinfo: "skip", showlegend: false },
  ];
  return (
    <figure className={styles.figure}>
      <PlotChart data={traces} height={340} layout={{
        xaxis: { range: [xMin, 56], visible: false, scaleanchor: "y" }, yaxis: { range: [yMid - hh, yMid + hh], visible: false },
        shapes: pitchShapes(c.line), showlegend: false, margin: { l: 4, r: 4, t: 4, b: 4 },
      }} />
      <figcaption className={styles.caption}>
        <b>{ex.label === "goal-side" ? "Goal-side" : "Not goal-side"}: {ex.margin_m > 0 ? "+" : ""}{ex.margin_m.toFixed(1)} m</b> ({ex.match}, {ex.clock}). Attacking left to right, goal on the right.{" "}
        {name} is {ex.d_goal_carrier} m from goal and the nearest opponent is {ex.d_goal_nearest} m from goal, so {ex.margin_m > 0 ? `he is ${ex.margin_m.toFixed(1)} m closer` : `the opponent is ${Math.abs(ex.margin_m).toFixed(1)} m closer`}.
      </figcaption>
    </figure>
  );
}

/** Chapter: Goal-side. Uses a forward, because these rows are for forwards. */
export default function GoalSidePage() {
  const chapter = chapterById("goal-side");
  const content = CHAPTER_CONTENT["goal-side"];
  const { isDark } = useTheme();
  const c = chartColors(isDark);
  const cardReq = useApi(`/players/card/${EXAMPLE_CARD}`);
  const card = cardReq.data;
  const id = card ? card.pff_player_id : null;
  const rowsReq = useApi(id ? `/players/${id}/rows` : null);
  const gsReq = useApi(id ? `/players/${id}/goalside` : null);
  const error = cardReq.error || rowsReq.error || gsReq.error;
  const rows = rowsReq.data, g = gsReq.data;
  const ready = card && rows && g;
  const first = card ? card.name.split(" ").slice(-1)[0] : "";
  const row = key => rows.rows.find(r => r.label === LABELS[key]);

  let body = null;
  if (ready) {
    const section = card.sections.find(s => s.title === "Goal-side");
    const v = g.volume, r = g.role, z = g.zone, tm = g.team, pr = g.progressive;
    const ORANGE = isDark ? "#f0a35a" : "#d9731a";
    const names = [first, "the attackers"];
    const barLayout = (title, extra = {}) => ({
      barmode: "group", xaxis: { gridcolor: c.grid, type: "category" }, yaxis: { title, tickformat: ".0%", gridcolor: c.grid, zeroline: false, rangemode: "tozero" },
      legend: { orientation: "h", y: 1.18 }, margin: { l: 64, r: 16, t: 36, b: 44 }, ...extra,
    });
    const pts = g.points;
    const gsPts = pts.filter(p => p.goalside), behind = pts.filter(p => !p.goalside);
    const pic = [
      { x: behind.map(p => p.x_att), y: behind.map(p => p.y_att), type: "scatter", mode: "markers", name: "a defender is closer to goal", marker: { size: 6, color: c.slow, opacity: 0.4 }, hoverinfo: "skip" },
      { x: gsPts.map(p => p.x_att), y: gsPts.map(p => p.y_att), type: "scatter", mode: "markers", name: "goal-side", marker: { size: 9, color: c.fast, opacity: 0.95, line: { color: c.text, width: 0.6 } }, hoverinfo: "skip" },
    ];
    const scatter = [
      { x: v.peers.filter(p => !p.me).map(p => p.t90), y: v.peers.filter(p => !p.me).map(p => p.share), type: "scatter", mode: "markers", name: "attackers",
        marker: { size: 8, color: c.slow, opacity: 0.8 }, hovertemplate: "%{x:.0f} touches per 90, %{y:.0%} goal-side<extra></extra>" },
      { x: [v.t90], y: [v.share], type: "scatter", mode: "markers+text", name: first, text: [first], textposition: "top center",
        marker: { size: 16, color: c.fast, line: { color: c.text, width: 1.5 } }, hovertemplate: `${first}: %{x:.0f} touches per 90, %{y:.0%} goal-side<extra></extra>` },
    ];
    const roleBars = [{
      x: r.groups.map(x => `${x.role} (${x.n})`), y: r.groups.map(x => x.median_share), type: "bar", marker: { color: r.groups.map(x => (x.me ? c.fast : c.slow)) },
      text: r.groups.map(x => pct(x.median_share)), textposition: "outside", cliponaxis: false,
    }];
    const zoneBars = [
      { x: z.groups.map(x => `${x.group} (${x.n})`), y: z.groups.map(x => x.rate), type: "bar", name: names[0], marker: { color: c.fast }, text: z.groups.map(x => pct(x.rate)), textposition: "outside", cliponaxis: false },
      { x: z.groups.map(x => `${x.group} (${x.n})`), y: z.groups.map(x => x.peer_rate), type: "bar", name: names[1], marker: { color: c.slow }, text: z.groups.map(x => pct(x.peer_rate)), textposition: "outside", cliponaxis: false },
    ];
    const mates = tm ? tm.attackers : [];
    const mateBars = [{
      x: mates.map(m => `${m.name.split(" ").slice(-1)[0]} (${m.position})`), y: mates.map(m => m.share), type: "bar",
      marker: { color: mates.map(m => (m.me ? c.fast : c.slow)) }, text: mates.map(m => pct(m.share)), textposition: "outside", cliponaxis: false,
    }];
    const progBars = [
      { x: ["Goal-side touches", "Touches with a defender closer to goal"], y: [pr.goalside.rate, pr.behind.rate], type: "bar", name: names[0], marker: { color: c.fast },
        text: [pct(pr.goalside.rate), pct(pr.behind.rate)], textposition: "outside", cliponaxis: false },
      { x: ["Goal-side touches", "Touches with a defender closer to goal"], y: [pr.goalside.peer_rate, pr.behind.peer_rate], type: "bar", name: names[1], marker: { color: c.slow },
        text: [pct(pr.goalside.peer_rate), pct(pr.behind.peer_rate)], textposition: "outside", cliponaxis: false },
    ];
    const per90Row = row("per90"), shareRow = row("share"), progRow = row("prog");
    const roleGap = (v.median_share - r.role_median) / (v.median_share - v.share);

    body = (
      <>
        <h2 className={styles.h2}>1. On the card</h2>
        <div className={styles.cardMini}>
          <CardFrame><div className={styles.cardMiniPad}>
            <Panel title={section.title} sub={section.sub} rows={section.rows} games={card.games} linkRows={false} highlightLabel={chapter.covers} />
          </div></CardFrame>
        </div>
        <dl className={styles.parts}>
          {chapter.covers.map(l => <div key={l}><dt>{l}</dt><dd>{content.means[l]}</dd></div>)}
        </dl>

        <h2 className={styles.h2}>2. How it is measured</h2>
        <p className={styles.explain}>
          At each touch, take the distance to goal of the nearest outfield opponent and subtract the player's own. Positive means he is closer to goal. Two of {first}'s real touches in the final:
        </p>
        <div className={styles.twoCol}>
          {g.examples.map(ex => <MomentFigure key={ex.label} ex={ex} name={first} c={c} orange={ORANGE} />)}
        </div>
        <figure className={styles.figure}>
          <PlotChart data={pic} height={380} layout={{
            xaxis: { range: [-56, 56], visible: false, scaleanchor: "y" }, yaxis: { range: [-37, 37], visible: false },
            shapes: pitchShapes(c.line), legend: { orientation: "h", y: -0.05 }, margin: { l: 4, r: 4, t: 4, b: 50 },
          }} />
          <figcaption className={styles.caption}>All {v.touches} of {first}'s touches across {card.games} matches, attacking left to right. Blue: he was closer to goal than the nearest outfield opponent ({v.goalside} of them).</figcaption>
        </figure>
        <ul className={styles.rules}>{content.measured.map(m => <li key={m}>{m}</li>)}</ul>

        <h2 className={styles.h2}>3. Why {first} gets these numbers</h2>

        <h3 className={styles.h3}>Goal-side receptions, per 90: {per90Row.val}</h3>
        <Arithmetic row={per90Row} player={rows.player} />
        <p className={styles.explain}>That count is how often he is on the ball times how often he is goal-side when he is:</p>
        <Sum parts={[v.t90.toFixed(1), "touches per 90 ×", pct(v.share, 1), "of them goal-side =", `${v.per90.toFixed(1)} per 90`]} />
        <p className={styles.explain}>
          He is busier than the attackers (median {v.median_t90.toFixed(1)} touches per 90) but goal-side less often (median {pct(v.median_share, 1)}), and the two cancel. On the median share he would have <b>{v.his_t90_on_median_share.toFixed(1)}</b> per 90; a median-touch attacker on his share would have <b>{v.median_t90_on_his_share.toFixed(1)}</b>.
        </p>
        <figure className={styles.figure}>
          <PlotChart data={scatter} height={320} layout={{
            xaxis: { title: "touches per 90", gridcolor: c.grid }, yaxis: { title: "share that are goal-side", tickformat: ".0%", gridcolor: c.grid, rangemode: "tozero" },
            showlegend: false, margin: { l: 70, r: 16, t: 16, b: 48 },
            shapes: [{ type: "line", xref: "paper", x0: 0, x1: 1, y0: v.median_share, y1: v.median_share, line: { color: c.text, width: 1, dash: "dash" } }],
          }} />
          <figcaption className={styles.caption}>One dot per attacker with 20+ touches. Dashed: the median share. {first} is to the right and below it.</figcaption>
        </figure>
        <RankBlock row={per90Row} player={rows.player} group="attackers" />

        <h3 className={styles.h3}>Touches that are goal-side: {shareRow.val}</h3>
        <Arithmetic row={shareRow} player={rows.player} />
        <p className={styles.explain}>
          <b>Is it his role?</b> Partly. The {v.pool_size} attackers include strikers and wide players, and a striker stands nearer goal than a winger beside a full-back. Median goal-side share: strikers {pct(r.groups.find(x => x.role === "striker").median_share)}, attacking midfielders {pct(r.groups.find(x => x.role === "attacking mid").median_share)}, wide forwards {pct(r.groups.find(x => x.role === "wide forward").median_share)}, wide midfielders {pct(r.groups.find(x => x.role === "wide midfielder").median_share)}.{" "}
          {first} is a {r.role} ({r.position}). The median for the {r.role_n} {r.role}s is {pct(r.role_median, 1)}, against {pct(v.median_share, 1)} for all attackers, which accounts for about {pct(Math.max(0, Math.min(1, roleGap)))} of his gap to the median; the rest is his own {pct(v.share, 1)}.
        </p>
        <figure className={styles.figure}>
          <PlotChart data={roleBars} height={300} layout={{
            xaxis: { gridcolor: c.grid, type: "category" }, yaxis: { title: "median goal-side share", tickformat: ".0%", gridcolor: c.grid, zeroline: false, rangemode: "tozero" },
            showlegend: false, margin: { l: 64, r: 16, t: 24, b: 44 },
          }} />
          <figcaption className={styles.caption}>Median share of touches that are goal-side by role, with the number of attackers in brackets. {first}'s role is in blue.</figcaption>
        </figure>
        {tm && (
          <>
            <p className={styles.explain}>The same pattern shows inside {tm.team}'s own attack: the central striker is highest, the wide players lowest (median for attackers at other teams {pct(tm.other_median, 1)}).</p>
            <figure className={styles.figure}>
              <PlotChart data={mateBars} height={280} layout={{
                xaxis: { gridcolor: c.grid, type: "category" }, yaxis: { title: "touches that are goal-side", tickformat: ".0%", gridcolor: c.grid, zeroline: false, rangemode: "tozero" },
                showlegend: false, margin: { l: 64, r: 16, t: 24, b: 44 },
                shapes: [{ type: "line", xref: "paper", x0: 0, x1: 1, y0: tm.other_median, y1: tm.other_median, line: { color: c.text, width: 1, dash: "dash" } }],
              }} />
              <figcaption className={styles.caption}>{tm.team}'s attackers with their listed position. Dashed: the median for attackers at the other teams. {first} is in blue.</figcaption>
            </figure>
          </>
        )}
        <p className={styles.explain}>
          <b>Is it where on the pitch?</b> Not in the way you might think. On the attackers' mix of pitch areas he would be at <b>{pct(z.his_rates_peer_mix, 1)}</b>, against his actual {pct(z.his_rate, 1)}. But his rate barely changes between thirds, while the others' falls from {pct(z.groups[0].peer_rate)} in their own third to {pct(z.groups[2].peer_rate)} in the final third. He also spends more of his touches in the final third ({pct(z.groups[2].mix)} against {pct(z.groups[2].peer_mix)} for attackers), where defenders sit closest to goal.
        </p>
        <figure className={styles.figure}>
          <PlotChart data={zoneBars} height={300} layout={barLayout("touches that are goal-side")} />
          <figcaption className={styles.caption}>Share of touches that are goal-side by part of the pitch, with {first}'s number of touches in brackets.</figcaption>
        </figure>
        <RankBlock row={shareRow} player={rows.player} group="attackers" />

        <h3 className={styles.h3}>Progressive from goal-side touches: {progRow.val}</h3>
        <Sum parts={[pr.goalside.k, "of", pr.goalside.n, "goal-side decisions =", pct(pr.goalside.rate, 1)]} />
        <p className={styles.explain}>
          Being goal-side goes with more progress for everyone: attackers progress {pct(pr.goalside.peer_rate, 1)} of goal-side touches against {pct(pr.behind.peer_rate, 1)} of the rest. {first} does so {pct(pr.goalside.rate, 1)} of the time, and {pct(pr.behind.rate, 1)} when a defender is closer to goal.
        </p>
        <figure className={styles.figure}>
          <PlotChart data={progBars} height={300} layout={barLayout("touches that progress")} />
          <figcaption className={styles.caption}>Progressive share of decisions, goal-side against not, {first} against the attackers ({pr.goalside.n} and {pr.behind.n} decisions for him).</figcaption>
        </figure>
        <RankBlock row={progRow} player={rows.player} group="attackers" />

        <p className={styles.caution}>
          <b>Can't tell:</b> {content.caution} It cannot say whether a goal-side touch came from a run in behind or from the defence standing deep, and a wide player beside a full-back near the byline can count.
        </p>

        <h2 className={styles.h2}>4. Try another attacker</h2>
        <TryAnother chapter={chapter} peers={rows.player.peers} defaultId={rows.player.pff_player_id} />
      </>
    );
  }

  return (
    <div>
      <h1 className={styles.title}>{chapter.title}</h1>
      <p className={styles.intro}>{content.intro} Data: PFF FC, 2022 World Cup.</p>
      {content.exampleNote && <p className={styles.muted}>{content.exampleNote}</p>}
      {(cardReq.loading || (card && (rowsReq.loading || gsReq.loading))) && <p className={styles.muted}>Loading…</p>}
      {error && <p className={styles.error}>Could not load the example ({error}). Is the backend running?</p>}
      {body}
      <h2 className={styles.h2}>{ready ? "5" : "2"}. The code</h2>
      <p className={styles.muted}>Real code from the Playing at Speed project, copied as is.</p>
      {(CHAPTER_CODE["goal-side"] || []).map(cb => <CodeBlock key={cb.fn} {...cb} />)}
    </div>
  );
}
