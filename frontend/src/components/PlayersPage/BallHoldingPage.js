import React from "react";
import useApi from "../hooks/useApi";
import { useTheme } from "../../contexts/ThemeContext";
import { CardFrame, Panel } from "./PlayerCard";
import { chapterById } from "./chapters";
import { CHAPTER_CONTENT } from "./chapterContent";
import { CHAPTER_CODE } from "./chapterCode";
import { Arithmetic, RankBlock, Sum, pct, num } from "./chapterBits";
import PlotChart, { chartColors } from "./PlotChart";
import { TryAnother } from "./ChapterPage";
import CodeBlock from "./CodeBlock";
import styles from "./PlayersPage.module.css";

const LABELS = {
  touches: "Touches per action", long: "Long holds (share of his actions)",
  very: "Very long holds (share of his actions)", idle: "Idle holds (of free-space actions)",
};
const hold = e => (e.idle ? "idle" : e.very ? "very long" : e.long ? "long" : "–");
const jitter = i => (((i * 37) % 17) / 17 - 0.5) * 0.5;

/** Chapter: Ball holding. */
export default function BallHoldingPage() {
  const chapter = chapterById("ball-holding");
  const content = CHAPTER_CONTENT["ball-holding"];
  const { isDark } = useTheme();
  const c = chartColors(isDark);
  const cardReq = useApi("/players/card/enzo_fernandez");
  const card = cardReq.data;
  const id = card ? card.pff_player_id : null;
  const rowsReq = useApi(id ? `/players/${id}/rows` : null);
  const holdReq = useApi(id ? `/players/${id}/holds` : null);
  const error = cardReq.error || rowsReq.error || holdReq.error;
  const rows = rowsReq.data, h = holdReq.data;
  const ready = card && rows && h;
  const first = card ? card.name.split(" ")[0] : "";
  const row = key => rows.rows.find(r => r.label === LABELS[key]);

  let body = null;
  if (ready) {
    const section = card.sections.find(s => s.title === "Ball holding");
    const s = h.summary;
    const ORANGE = isDark ? "#f0a35a" : "#d9731a";
    const names = [first, "the midfielders"];
    const dist = h.touches;
    const cost = h.cost.rows;
    const costFor = (start, touches) => cost.find(r => r.start === start && r.touches === touches);
    const bucketsCost = ["1-2", "3", "4-5", "6+"];
    const startCols = { tight: c.slow, contested: c.peer, free: ORANGE };
    const startNames = { tight: "Starts tight (under 3 m)", contested: "Starts contested (3 to 6 m)", free: "Starts free (6+ m)" };

    // the picture: each action by touches and seconds
    const pts = h.picture.map((p, i) => ({ ...p, jx: p.touches + jitter(i), kind: p.idle ? "idle" : p.long ? "long" : "short" }));
    const group = (k, name, color) => {
      const g = pts.filter(p => p.kind === k);
      return { x: g.map(p => p.jx), y: g.map(p => Math.min(p.time_on_ball, 8)), type: "scatter", mode: "markers", name,
        marker: { size: 7, color, opacity: 0.8 }, text: g.map(p => `${p.touches} touches, ${p.time_on_ball} s, nearest defender ${p.nearest_m == null ? "unknown" : p.nearest_m + " m"}`),
        hovertemplate: "%{text}<extra></extra>" };
    };
    const pic = [group("short", "not a long hold", c.slow), group("long", "long hold", c.fast), group("idle", "idle hold (long, nobody within 6 m)", ORANGE)];
    const region = isDark ? "rgba(154,160,255,0.12)" : "rgba(59,70,224,0.09)";
    const picLayout = {
      xaxis: { title: "touches before he releases the ball", range: [0.3, 12.5], dtick: 1, gridcolor: c.grid, zeroline: false },
      yaxis: { title: "seconds on the ball", range: [0, 8.3], gridcolor: c.grid, zeroline: false },
      shapes: [
        { type: "rect", x0: 3.5, x1: 12.5, y0: 0, y1: 8.3, fillcolor: region, line: { width: 0 }, layer: "below" },
        { type: "rect", x0: 0.3, x1: 12.5, y0: 3, y1: 8.3, fillcolor: region, line: { width: 0 }, layer: "below" },
      ],
      legend: { orientation: "h", y: -0.25 }, margin: { l: 60, r: 16, t: 12, b: 80 },
    };

    // touches per action: distribution
    const distBars = [
      { x: dist.buckets, y: dist.buckets.map(b => dist.player[b]), type: "bar", name: first, marker: { color: c.fast },
        text: dist.buckets.map(b => pct(dist.player[b])), textposition: "outside", cliponaxis: false },
      { x: dist.buckets, y: dist.buckets.map(b => dist.peers[b]), type: "bar", name: names[1], marker: { color: c.slow },
        text: dist.buckets.map(b => pct(dist.peers[b])), textposition: "outside", cliponaxis: false },
    ];
    const barLayout = (title, extra = {}) => ({
      barmode: "group", xaxis: { gridcolor: c.grid, type: "category" }, yaxis: { title, tickformat: ".0%", gridcolor: c.grid, zeroline: false, rangemode: "tozero" },
      legend: { orientation: "h", y: 1.18 }, margin: { l: 64, r: 16, t: 36, b: 44 }, ...extra,
    });

    const band = h.tables.space || [];
    const bandBars = [
      { x: band.map(g => `${g.group} (${g.n})`), y: band.map(g => g.rate), type: "bar", name: first, marker: { color: c.fast },
        text: band.map(g => pct(g.rate)), textposition: "outside", cliponaxis: false },
      { x: band.map(g => `${g.group} (${g.n})`), y: band.map(g => g.peer_rate), type: "bar", name: names[1], marker: { color: c.slow },
        text: band.map(g => pct(g.peer_rate)), textposition: "outside", cliponaxis: false },
    ];

    // cost of a hold
    const costLines = (field, fmt) => ["tight", "contested", "free"].map(start => ({
      x: bucketsCost, y: bucketsCost.map(t => costFor(start, t)?.[field]), type: "scatter", mode: "lines+markers", name: startNames[start],
      line: { color: startCols[start], width: 2 }, marker: { size: 8, color: startCols[start] },
      hovertemplate: `${startNames[start]}, %{x} touches: %{y${fmt}}<extra></extra>`,
    }));
    const f12 = costFor("free", "1-2"), f6 = costFor("free", "6+");
    const t12 = costFor("tight", "1-2"), t6 = costFor("tight", "6+");

    const touchesRow = row("touches"), longRow = row("long"), veryRow = row("very"), idleRow = row("idle");
    const tests = h.tests;

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
        <p className={styles.explain}>Every time he releases the ball, two things are recorded: how many touches he took, and how many seconds he had it. A hold is long if either passes its line.</p>
        <figure className={styles.figure}>
          <PlotChart data={pic} height={380} layout={picLayout} />
          <figcaption className={styles.caption}>
            Each dot is one of {first}'s actions ({h.picture.length} of his {s.actions} have a seconds reading; dots are nudged sideways so they do not stack). The shaded area is a long hold: 4+ touches or 3+ seconds.
            Orange dots are long holds with nobody within 6 m: idle holds.
          </figcaption>
        </figure>
        <p className={styles.explain}>Ten of his actions in a row, from {h.example_match}:</p>
        <div className={styles.tblWrap}>
          <table className={styles.tbl}>
            <thead><tr><th>Time</th><th>Action</th><th>Touches</th><th>Seconds</th><th>Nearest defender</th><th>Hold</th></tr></thead>
            <tbody>
              {h.examples.map((e, i) => (
                <tr key={i}>
                  <td>{e.clock}</td><td>{e.action}</td>
                  <td className={e.touches >= 4 ? styles.hit : ""}>{e.touches}</td>
                  <td className={e.time_on_ball >= 3 ? styles.hit : ""}>{e.time_on_ball ?? "–"}</td>
                  <td>{e.nearest_m == null ? "–" : `${e.nearest_m} m`}</td>
                  <td className={e.idle ? styles.miss : e.long ? styles.hit : ""}>{hold(e)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className={styles.rules}>{content.measured.map(m => <li key={m}>{m}</li>)}</ul>

        <h2 className={styles.h2}>3. Why {first} gets these numbers</h2>

        <h3 className={styles.h3}>Touches per action: {touchesRow.val}</h3>
        <Sum parts={[num(Math.round(s.mean_touches * s.actions)), "touches in", num(s.actions), "actions =", s.mean_touches.toFixed(2)]} />
        <p className={styles.explain}>
          The midfielders average {s.peer_mean_touches.toFixed(2)}. He is lower on one touch ({pct(dist.player["1"])} of his actions against {pct(dist.peers["1"])}) and higher from three touches up.
        </p>
        <figure className={styles.figure}>
          <PlotChart data={distBars} height={300} layout={barLayout("share of actions")} />
          <figcaption className={styles.caption}>How many touches he takes before releasing the ball, {first} against the {h.pool_size} midfielders the card compares him with.</figcaption>
        </figure>
        <RankBlock row={touchesRow} player={rows.player} group="midfielders" />

        <h3 className={styles.h3}>Long holds: {longRow.val}</h3>
        <Arithmetic row={longRow} player={rows.player} />
        <p className={styles.explain}>
          It is a touches habit. {pct(h.routes.player["Touches only"], 1)} of his actions are long on touches alone (midfielders {pct(h.routes.peers["Touches only"], 1)}); only {pct(h.routes.player["Seconds only"], 1)} are long on seconds alone ({pct(h.routes.peers["Seconds only"], 1)}).
        </p>
        <p className={styles.explain}>
          <b>Is it where or what?</b> Holds are more common in free space, and he is in free space more often. And passes are held less than dribbles, but 95% of his actions are passes. I gave him each mix from the other midfielders and kept his own rates:
        </p>
        <div className={styles.tblWrap}>
          <table className={styles.tbl}>
            <thead><tr><th>If he had the midfielders' mix of…</th><th>His long-hold rate would be</th><th>His actual</th><th>Midfielders</th></tr></thead>
            <tbody>
              <tr><td>Space at the action (tight, contested, free)</td><td>{pct(tests.space.his_rates_peer_mix, 1)}</td><td>{pct(tests.space.his_rate, 1)}</td><td>{pct(tests.space.peer_rate, 1)}</td></tr>
              <tr><td>Kind of action (pass or other)</td><td>{pct(tests.kind.his_rates_peer_mix, 1)}</td><td>{pct(tests.kind.his_rate, 1)}</td><td>{pct(tests.kind.peer_rate, 1)}</td></tr>
            </tbody>
          </table>
        </div>
        <p className={styles.explain}>Neither moves it. He holds more than the midfielders in every setting:</p>
        <figure className={styles.figure}>
          <PlotChart data={bandBars} height={300} layout={barLayout("long-hold rate")} />
          <figcaption className={styles.caption}>Long-hold rate by space at the action, with {first}'s number of actions in brackets.</figcaption>
        </figure>
        <RankBlock row={longRow} player={rows.player} group="midfielders" />

        <h3 className={styles.h3}>Very long holds: {veryRow.val}</h3>
        <Arithmetic row={veryRow} player={rows.player} />
        <p className={styles.explain}>
          Six or more touches is the tail of the chart above: {pct(dist.player["6+"], 1)} of his actions against {pct(dist.peers["6+"], 1)} for the midfielders.
        </p>
        <RankBlock row={veryRow} player={rows.player} group="midfielders" />

        <h3 className={styles.h3}>Idle holds: {idleRow.val}</h3>
        <Arithmetic row={idleRow} player={rows.player} />
        <p className={styles.explain}>
          He is in free space more often ({pct(h.idle.free_share, 1)} of his actions, midfielders {pct(h.idle.peer_free_share, 1)}), and idles slightly more once there ({pct(h.idle.idle_rate, 1)} against {pct(h.idle.peer_idle_rate, 1)}).
          This is the row that matters for team flow, because that is where a long hold costs something:
        </p>
        <div className={styles.twoCol}>
          <figure className={styles.figure}>
            <PlotChart data={costLines("progressive", ":.0%")} height={320} layout={{
              xaxis: { title: "touches taken", gridcolor: c.grid, type: "category" }, yaxis: { title: "passes that progress", tickformat: ".0%", gridcolor: c.grid, rangemode: "tozero" },
              legend: { orientation: "h", y: -0.35 }, margin: { l: 64, r: 16, t: 16, b: 100 },
            }} />
            <figcaption className={styles.caption}>Share of passes that progress, by touches taken before the pass.</figcaption>
          </figure>
          <figure className={styles.figure}>
            <PlotChart data={costLines("space_change", ":.1f")} height={320} layout={{
              xaxis: { title: "touches taken", gridcolor: c.grid, type: "category" }, yaxis: { title: "space gained (m)", gridcolor: c.grid, zeroline: true },
              legend: { orientation: "h", y: -0.35 }, margin: { l: 64, r: 16, t: 16, b: 100 },
            }} />
            <figcaption className={styles.caption}>Change in the nearest defender's distance between getting the ball and passing it. Below zero: defenders closed in.</figcaption>
          </figure>
        </div>
        <p className={styles.explain}>
          All World Cup players, {num(h.cost.passes)} passes. Starting in free space, 6+ touches loses {Math.abs(f6.space_change - f12.space_change).toFixed(1)} m more space than 1 to 2 touches, and the progressive share falls from {pct(f12.progressive, 1)} to {pct(f6.progressive, 1)}.
          Starting tight it goes the other way: extra touches go with winning space ({t12.space_change.toFixed(1)} m to {t6.space_change > 0 ? "+" : ""}{t6.space_change.toFixed(1)} m) and more progressive passes ({pct(t12.progressive)} to {pct(t6.progressive)}): players working their way out.
        </p>
        <RankBlock row={idleRow} player={rows.player} group="midfielders" />

        <p className={styles.caution}>
          <b>Can't tell:</b> {content.caution} Whether a long hold caused a worse pass, or he held because he had no option, is not separated here.
        </p>

        <h2 className={styles.h2}>4. Try another midfielder</h2>
        <TryAnother chapter={chapter} peers={rows.player.peers} defaultId={rows.player.pff_player_id} />
      </>
    );
  }

  return (
    <div>
      <h1 className={styles.title}>{chapter.title}</h1>
      <p className={styles.intro}>{content.intro} Data: PFF FC, 2022 World Cup.</p>
      {(cardReq.loading || (card && (rowsReq.loading || holdReq.loading))) && <p className={styles.muted}>Loading…</p>}
      {error && <p className={styles.error}>Could not load the example ({error}). Is the backend running?</p>}
      {body}
      <h2 className={styles.h2}>{ready ? "5" : "2"}. The code</h2>
      <p className={styles.muted}>Real code from the Playing at Speed project, copied as is.</p>
      {(CHAPTER_CODE["ball-holding"] || []).map(cb => <CodeBlock key={cb.fn} {...cb} />)}
    </div>
  );
}
