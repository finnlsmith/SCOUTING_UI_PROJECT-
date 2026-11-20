import React from "react";
import useApi from "../hooks/useApi";
import { useTheme } from "../../contexts/ThemeContext";
import { CardFrame, Panel } from "./PlayerCard";
import { chapterById } from "./chapters";
import { CHAPTER_CONTENT } from "./chapterContent";
import { CHAPTER_CODE } from "./chapterCode";
import { Arithmetic, RankBlock, pct } from "./chapterBits";
import PlotChart, { chartColors, pitchShapes } from "./PlotChart";
import { TryAnother } from "./ChapterPage";
import CodeBlock from "./CodeBlock";
import styles from "./PlayersPage.module.css";

const ROW = "Moments with 2+ s on the ball";

/** One real moment: the carrier, his teammates, every opponent with the spot he reaches after 0.7 s, and the quickest to arrive. */
function MomentFigure({ ex, c, orange }) {
  const near = ex.opponents.find(o => o.nearest_in_time);
  const t = ex.reaction_s;
  // zoom so the quickest opponent is comfortably inside the picture
  const hw = Math.min(26, Math.max(14, near.dist + 4)), hh = hw * 0.78;
  const inView = p => Math.abs(p.x - ex.carrier.x) <= hw && Math.abs(p.y - ex.carrier.y) <= hh;
  const opps = ex.opponents.filter(inView);
  const arrows = { x: [], y: [] };
  opps.forEach(o => { arrows.x.push(o.x, o.x + o.vx * t, null); arrows.y.push(o.y, o.y + o.vy * t, null); });
  const traces = [
    { x: ex.teammates.filter(inView).map(p => p.x), y: ex.teammates.filter(inView).map(p => p.y), type: "scatter", mode: "markers", name: "teammates",
      marker: { size: 9, color: c.slow, opacity: 0.7 }, hoverinfo: "skip" },
    { x: arrows.x, y: arrows.y, type: "scatter", mode: "lines", name: "where each opponent is after 0.7 s", line: { color: orange, width: 2 }, hoverinfo: "skip" },
    { x: opps.map(o => o.x), y: opps.map(o => o.y), type: "scatter", mode: "markers+text", name: "opponents",
      marker: { size: opps.map(o => (o.nearest_in_time ? 14 : 10)), color: orange, line: { color: c.text, width: opps.map(o => (o.nearest_in_time ? 2 : 0)) } },
      text: opps.map(o => `${o.tti.toFixed(1)} s`), textposition: "top right", textfont: { size: 11, color: c.text },
      hovertemplate: "%{text} to reach him<extra></extra>" },
    { x: [near.x + near.vx * t, ex.carrier.x], y: [near.y + near.vy * t, ex.carrier.y], type: "scatter", mode: "lines", name: "quickest run",
      line: { color: c.fast, width: 2.5, dash: "dash" }, hoverinfo: "skip" },
    { x: [ex.carrier.x], y: [ex.carrier.y], type: "scatter", mode: "markers", name: "Enzo", marker: { size: 17, color: c.fast, line: { color: c.text, width: 2 } }, hoverinfo: "skip" },
  ];
  return (
    <figure className={styles.figure}>
      <PlotChart data={traces} height={340} layout={{
        xaxis: { range: [ex.carrier.x - hw, ex.carrier.x + hw], visible: false, scaleanchor: "y" },
        yaxis: { range: [ex.carrier.y - hh, ex.carrier.y + hh], visible: false },
        shapes: pitchShapes(c.line), showlegend: false, margin: { l: 4, r: 4, t: 4, b: 4 },
      }} />
      <figcaption className={styles.caption}>
        <b>{ex.label === "pressed" ? "Pressed" : "Free"}: {ex.time_on_ball.toFixed(2)} s</b> ({ex.match}, {ex.clock}, pass from {ex.passer}). Attacking left to right.
        Each label is that opponent's time to reach him. The dashed line is the quickest: an opponent {near.dist} m away at the moment of the pass.
        {ex.time_on_ball >= 2 ? " This moment counts towards the row." : " This moment does not."}
      </figcaption>
    </figure>
  );
}

/** Chapter: Time on the ball. */
export default function TimeOnBallPage() {
  const chapter = chapterById("time-on-ball");
  const content = CHAPTER_CONTENT["time-on-ball"];
  const { isDark } = useTheme();
  const c = chartColors(isDark);
  const cardReq = useApi("/players/card/enzo_fernandez");
  const card = cardReq.data;
  const id = card ? card.pff_player_id : null;
  const rowsReq = useApi(id ? `/players/${id}/rows` : null);
  const timeReq = useApi(id ? `/players/${id}/time` : null);
  const error = cardReq.error || rowsReq.error || timeReq.error;
  const rows = rowsReq.data, t = timeReq.data;
  const ready = card && rows && t;
  const first = card ? card.name.split(" ")[0] : "";

  let body = null;
  if (ready) {
    const section = card.sections.find(s => s.title === "What the game gave him");
    const row = rows.rows.find(r => r.label === ROW);
    const s = t.summary, b = t.bands;
    const ORANGE = isDark ? "#f0a35a" : "#d9731a";
    const names = [first, "the midfielders"];
    const barLayout = (title, extra = {}) => ({
      barmode: "group", xaxis: { gridcolor: c.grid, type: "category" }, yaxis: { title, tickformat: ".0%", gridcolor: c.grid, zeroline: false, rangemode: "tozero" },
      legend: { orientation: "h", y: 1.18 }, margin: { l: 64, r: 16, t: 36, b: 44 }, ...extra,
    });
    const bandBars = [
      { x: b.labels, y: b.labels.map(l => b.player[l]), type: "bar", name: first, marker: { color: b.labels.map(l => c.fast) },
        text: b.labels.map(l => pct(b.player[l])), textposition: "outside", cliponaxis: false },
      { x: b.labels, y: b.labels.map(l => b.peers[l]), type: "bar", name: names[1], marker: { color: c.slow },
        text: b.labels.map(l => pct(b.peers[l])), textposition: "outside", cliponaxis: false },
    ];
    const groupBars = rowsOf => [
      { x: rowsOf.map(g => `${g.group} (${g.n})`), y: rowsOf.map(g => g.rate), type: "bar", name: first, marker: { color: c.fast },
        text: rowsOf.map(g => (g.rate == null ? "" : pct(g.rate))), textposition: "outside", cliponaxis: false },
      { x: rowsOf.map(g => `${g.group} (${g.n})`), y: rowsOf.map(g => g.peer_rate), type: "bar", name: names[1], marker: { color: c.slow },
        text: rowsOf.map(g => pct(g.peer_rate)), textposition: "outside", cliponaxis: false },
    ];
    const tm = t.team;
    const mates = tm ? tm.midfielders : [];
    const mateBars = [{
      x: mates.map(m => `${m.name.split(" ").slice(-1)[0]} (${m.moments})`), y: mates.map(m => m.share), type: "bar",
      marker: { color: mates.map(m => (m.me ? c.fast : c.slow)) }, text: mates.map(m => pct(m.share)), textposition: "outside", cliponaxis: false,
    }];

    body = (
      <>
        <h2 className={styles.h2}>1. On the card</h2>
        <div className={styles.cardMini}>
          <CardFrame><div className={styles.cardMiniPad}>
            <Panel title={section.title} sub={section.sub} rows={section.rows} games={card.games} linkRows={false} highlightLabel={chapter.covers} />
          </div></CardFrame>
        </div>
        <dl className={styles.parts}>
          <div><dt>{ROW}</dt><dd>{content.means[ROW]}</dd></div>
        </dl>

        <h2 className={styles.h2}>2. How it is measured</h2>
        <p className={styles.explain}>
          At each moment, every opponent keeps running for 0.7 s, then runs straight at the player on the ball at 5 m/s. Time to reach him = 0.7 s plus the distance left at that point ÷ 5 m/s.
          The quickest of the {t.examples[0].opponents.length} opponents sets the time on the ball. Two of {first}'s real moments from the final:
        </p>
        <div className={styles.twoCol}>
          {t.examples.map(ex => <MomentFigure key={ex.label} ex={ex} c={c} orange={ORANGE} />)}
        </div>
        <p className={styles.muted}>Orange: opponents, with a line to where each would be after 0.7 s. Grey: his teammates. Blue: {first}.</p>
        <ul className={styles.rules}>{content.measured.map(m => <li key={m}>{m}</li>)}</ul>

        <h2 className={styles.h2}>3. Why {first} gets 35%</h2>
        <Arithmetic row={row} player={rows.player} />
        <p className={styles.explain}>
          His median time on the ball is {s.median_seconds.toFixed(2)} s against {s.peer_median_seconds.toFixed(2)} s for the midfielders. Fewer of his moments are rushed (under 1 s: {pct(b.player["Under 1 s"], 1)} against {pct(b.peers["Under 1 s"], 1)}),
          and more fall at 2 to 3 s ({pct(b.player["2 to 3 s"], 1)} against {pct(b.peers["2 to 3 s"], 1)}). The last two bars are the row.
        </p>
        <figure className={styles.figure}>
          <PlotChart data={bandBars} height={320} layout={barLayout("share of moments")} />
          <figcaption className={styles.caption}>How much time his {s.moments.toLocaleString("en-GB")} moments gave him, against the midfielders' moments together. 2 s and up counts.</figcaption>
        </figure>

        <p className={styles.explain}>
          <b>Is it what he is doing, or where?</b> Receiving gives more time than releasing, and the final third gives least. I gave him each mix from the other midfielders and kept his own rates:
        </p>
        <div className={styles.tblWrap}>
          <table className={styles.tbl}>
            <thead><tr><th>If he had the midfielders' mix of…</th><th>His 2+ s share would be</th><th>His actual</th><th>Midfielders</th></tr></thead>
            <tbody>
              <tr><td>Receiving or releasing the ball</td><td>{pct(t.tests.kind.his_rates_peer_mix, 1)}</td><td>{pct(t.tests.kind.his_rate, 1)}</td><td>{pct(t.tests.kind.peer_rate, 1)}</td></tr>
              <tr><td>Part of the pitch (own, middle, final third)</td><td>{pct(t.tests.zone.his_rates_peer_mix, 1)}</td><td>{pct(t.tests.zone.his_rate, 1)}</td><td>{pct(t.tests.zone.peer_rate, 1)}</td></tr>
            </tbody>
          </table>
        </div>
        <p className={styles.explain}>Neither moves it. He gets more time than the midfielders in every kind of moment and every part of the pitch:</p>
        <div className={styles.twoCol}>
          <figure className={styles.figure}>
            <PlotChart data={groupBars(t.tables.kind)} height={300} layout={barLayout("moments with 2+ s")} />
            <figcaption className={styles.caption}>By kind of moment, with {first}'s number of moments in brackets.</figcaption>
          </figure>
          <figure className={styles.figure}>
            <PlotChart data={groupBars(t.tables.zone)} height={300} layout={barLayout("moments with 2+ s")} />
            <figcaption className={styles.caption}>By part of the pitch, in the attacking frame.</figcaption>
          </figure>
        </div>

        {tm && (
          <>
            <p className={styles.explain}>
              <b>Is it his team?</b> Not simply. {tm.team} as a whole gives its players {pct(tm.share, 1)} of moments with 2+ s, {tm.rank}th of {tm.teams} teams (median {pct(tm.median_team_share, 1)}). And in the same team the midfielders differ a lot:
            </p>
            <figure className={styles.figure}>
              <PlotChart data={mateBars} height={280} layout={{
                xaxis: { gridcolor: c.grid, type: "category" }, yaxis: { title: "moments with 2+ s", tickformat: ".0%", gridcolor: c.grid, zeroline: false, rangemode: "tozero" },
                showlegend: false, margin: { l: 64, r: 16, t: 24, b: 44 },
              }} />
              <figcaption className={styles.caption}>{tm.team}'s midfielders with 50+ moments, with their number of moments in brackets. {first} is in blue.</figcaption>
            </figure>
          </>
        )}
        <RankBlock row={row} player={rows.player} group="midfielders" />
        <p className={styles.caution}>
          <b>Can't tell:</b> {content.caution} It cannot separate his own movement into space from how his teammates and the opponent set up around him.
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
      {(cardReq.loading || (card && (rowsReq.loading || timeReq.loading))) && <p className={styles.muted}>Loading…</p>}
      {error && <p className={styles.error}>Could not load the example ({error}). Is the backend running?</p>}
      {body}
      <h2 className={styles.h2}>{ready ? "5" : "2"}. The code</h2>
      <p className={styles.muted}>Real code from the Playing at Speed project, copied as is.</p>
      {(CHAPTER_CODE["time-on-ball"] || []).map(cb => <CodeBlock key={cb.fn} {...cb} />)}
    </div>
  );
}
