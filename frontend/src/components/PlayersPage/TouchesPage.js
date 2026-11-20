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

const ROW = "Touches per 90";
const OUT = { positive: "progressive", neutral: "kept", negative: "lost", other: "other" };

/** Chapter: Touches. */
export default function TouchesPage() {
  const chapter = chapterById("touches");
  const content = CHAPTER_CONTENT["touches"];
  const { isDark } = useTheme();
  const c = chartColors(isDark);
  const cardReq = useApi("/players/card/enzo_fernandez");
  const card = cardReq.data;
  const id = card ? card.pff_player_id : null;
  const rowsReq = useApi(id ? `/players/${id}/rows` : null);
  const touchReq = useApi(id ? `/players/${id}/touches` : null);
  const error = cardReq.error || rowsReq.error || touchReq.error;
  const rows = rowsReq.data, t = touchReq.data;
  const ready = card && rows && t;
  const first = card ? card.name.split(" ")[0] : "";

  let body = null;
  if (ready) {
    const section = card.sections.find(s => s.rows.some(r => r.label === ROW));
    const row = rows.rows.find(r => r.label === ROW);
    const v = t.volume, z = t.zones, tm = t.team, bm = t.by_match;
    const ORANGE = isDark ? "#f0a35a" : "#d9731a";

    // the picture: his touches, coloured by what he did next
    const pts = t.points;
    const groups = [
      ["PA", "pass", c.fast], ["CH", "dribble or challenge", ORANGE],
    ];
    const other = pts.filter(p => p.last_kind !== "PA" && p.last_kind !== "CH");
    const pic = [
      ...groups.map(([k, name, color]) => {
        const g = pts.filter(p => p.last_kind === k);
        return { x: g.map(p => p.x_att), y: g.map(p => p.y_att), type: "scatter", mode: "markers", name, marker: { size: 8, color, opacity: k === "PA" ? 0.55 : 0.9, line: { color: c.text, width: 0.4 } }, hoverinfo: "skip" };
      }),
      { x: other.map(p => p.x_att), y: other.map(p => p.y_att), type: "scatter", mode: "markers", name: "other (clearance, shot, cross, ...)", marker: { size: 8, color: c.slow, opacity: 0.9, line: { color: c.text, width: 0.4 } }, hoverinfo: "skip" },
    ];

    const scatter = [
      { x: v.peers.filter(p => !p.me).map(p => p.team90), y: v.peers.filter(p => !p.me).map(p => p.per90), type: "scatter", mode: "markers", name: "midfielders",
        marker: { size: 8, color: c.slow, opacity: 0.8 }, hovertemplate: "team: %{x:.0f} touches per 90, him: %{y:.0f}<extra></extra>" },
      { x: [v.team90], y: [v.per90], type: "scatter", mode: "markers+text", name: first, text: [first], textposition: "top center",
        marker: { size: 16, color: c.fast, line: { color: c.text, width: 1.5 } }, hovertemplate: `${first}: team %{x:.0f} touches per 90, him %{y:.0f}<extra></extra>` },
    ];
    const zoneBars = [
      { x: z.labels, y: z.labels.map(l => z.player[l]), type: "bar", name: first, marker: { color: c.fast },
        text: z.labels.map(l => z.player[l].toFixed(1)), textposition: "outside", cliponaxis: false },
      { x: z.labels, y: z.labels.map(l => z.peers[l]), type: "bar", name: "the midfielders (average)", marker: { color: c.slow },
        text: z.labels.map(l => z.peers[l].toFixed(1)), textposition: "outside", cliponaxis: false },
    ];
    const mr = bm.rows;
    const matchBars = [{
      x: mr.map(r => `${r.match.replace(" v ", " – ")} (${Math.round(r.minutes)} min)`), y: mr.map(r => r.per90), type: "bar", marker: { color: c.fast },
      text: mr.map(r => r.per90.toFixed(0)), textposition: "outside", cliponaxis: false,
    }];
    const mates = tm ? tm.midfielders : [];
    const mateBars = [{
      x: mates.map(m => `${m.name.split(" ").slice(-1)[0]} (${Math.round(m.minutes)} min)`), y: mates.map(m => m.per90), type: "bar",
      marker: { color: mates.map(m => (m.me ? c.fast : c.slow)) }, text: mates.map(m => m.per90.toFixed(0)), textposition: "outside", cliponaxis: false,
    }];
    const minPer90 = Math.min(...mr.map(r => r.per90)), maxPer90 = Math.max(...mr.map(r => r.per90));

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
        <p className={styles.explain}>Each time he gets the ball and does something with it counts once, wherever he is.</p>
        <figure className={styles.figure}>
          <PlotChart data={pic} height={400} layout={{
            xaxis: { range: [-56, 56], visible: false, scaleanchor: "y" }, yaxis: { range: [-37, 37], visible: false },
            shapes: pitchShapes(c.line), legend: { orientation: "h", y: -0.05 }, margin: { l: 4, r: 4, t: 4, b: 50 },
          }} />
          <figcaption className={styles.caption}>
            Each dot is one of {first}'s {v.touches} touches across {rows.player.matches} matches, attacking left to right. Colour is what he did with it: {pct(t.next.player["Pass"])} were passes (midfielders {pct(t.next.peers["Pass"])}).
          </figcaption>
        </figure>
        <p className={styles.explain}>Eight of his touches, from {t.example_match}:</p>
        <div className={styles.tblWrap}>
          <table className={styles.tbl}>
            <thead><tr><th>Part of the pitch</th><th>Nearest opponent</th><th>Then</th><th>Outcome</th></tr></thead>
            <tbody>
              {t.examples.map((e, i) => (
                <tr key={i}>
                  <td>{e.zone}</td><td>{e.space_m} m</td><td>{(e.kind || "").toLowerCase()}</td>
                  <td className={e.outcome === "negative" ? styles.miss : e.outcome === "positive" ? styles.hit : ""}>{OUT[e.outcome]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className={styles.rules}>{content.measured.map(m => <li key={m}>{m}</li>)}</ul>

        <h2 className={styles.h2}>3. Why {first} gets {row.val}</h2>
        <Arithmetic row={row} player={rows.player} />
        <p className={styles.explain}>That count is how fast his team plays while he is on, times how much of it goes through him:</p>
        <Sum parts={[Math.round(v.team90), "team touches per 90 ×", pct(v.involve / 100, 1), "of them his =", `${v.per90.toFixed(1)} per 90`]} />
        <p className={styles.explain}>
          Both help, about equally. The midfielders' median is {v.median_per90.toFixed(1)}, with team tempo {Math.round(v.median_team90)} and a {pct(v.median_involve / 100, 1)} share.
          At the median tempo he would have <b>{v.his_share_on_median_tempo.toFixed(1)}</b>. A median-share player on his team's tempo would have <b>{v.median_share_on_his_tempo.toFixed(1)}</b>.
          Tempo matters across the group: team tempo and touches per 90 correlate at {v.correlation.toFixed(2)}.
        </p>
        <figure className={styles.figure}>
          <PlotChart data={scatter} height={320} layout={{
            xaxis: { title: "team touches per 90 while he was on the pitch", gridcolor: c.grid }, yaxis: { title: "his touches per 90", gridcolor: c.grid, rangemode: "tozero" },
            showlegend: false, margin: { l: 64, r: 16, t: 16, b: 48 },
          }} />
          <figcaption className={styles.caption}>One dot per midfielder. {first} is to the right (his team plays fast) and above the cloud (he takes a big share of it).</figcaption>
        </figure>

        <p className={styles.explain}>
          <b>Where do the extra touches come from?</b> Mostly the middle third. Per 90 he has {z.player["Middle third"].toFixed(1)} there against {z.peers["Middle third"].toFixed(1)} for the average midfielder, {z.player["Own third"].toFixed(1)} against {z.peers["Own third"].toFixed(1)} in his own third, and the same in the final third ({z.player["Final third"].toFixed(1)} against {z.peers["Final third"].toFixed(1)}).
        </p>
        <figure className={styles.figure}>
          <PlotChart data={zoneBars} height={300} layout={{
            barmode: "group", xaxis: { gridcolor: c.grid, type: "category" }, yaxis: { title: "touches per 90", gridcolor: c.grid, zeroline: false, rangemode: "tozero" },
            legend: { orientation: "h", y: 1.18 }, margin: { l: 64, r: 16, t: 36, b: 44 },
          }} />
          <figcaption className={styles.caption}>Touches per 90 by part of the pitch, in the attacking frame.</figcaption>
        </figure>

        <p className={styles.explain}>
          <b>Is it one big match?</b> It swings: from {minPer90.toFixed(0)} to {maxPer90.toFixed(0)} per 90 across his {mr.length} matches (the midfielders' median match is {bm.median_per90.toFixed(0)}). He is above it in {mr.filter(r => r.per90 > bm.median_per90).length} of {mr.length}, and the biggest matches lift the average.
        </p>
        <figure className={styles.figure}>
          <PlotChart data={matchBars} height={320} layout={{
            xaxis: { gridcolor: c.grid, type: "category", tickangle: -20 }, yaxis: { title: "touches per 90", gridcolor: c.grid, zeroline: false, rangemode: "tozero" },
            showlegend: false, margin: { l: 64, r: 16, t: 24, b: 100 },
            shapes: [{ type: "line", xref: "paper", x0: 0, x1: 1, y0: bm.median_per90, y1: bm.median_per90, line: { color: c.text, width: 1, dash: "dash" } }],
          }} />
          <figcaption className={styles.caption}>His touches per 90 in each match, with the minutes he played. Dashed: the midfielders' median for a match.</figcaption>
        </figure>

        {tm && (
          <>
            <p className={styles.explain}>
              <b>Is it his team?</b> A lot of it. {tm.team} had {Math.round(tm.tempo)} touches per 90, {tm.rank}th of {tm.teams} teams (median {Math.round(tm.median_tempo)}). Three of its midfielders are far above the midfielders at other teams (median {tm.other_midfielders_median.toFixed(0)}), and one is not:
            </p>
            <figure className={styles.figure}>
              <PlotChart data={mateBars} height={280} layout={{
                xaxis: { gridcolor: c.grid, type: "category" }, yaxis: { title: "touches per 90", gridcolor: c.grid, zeroline: false, rangemode: "tozero" },
                showlegend: false, margin: { l: 64, r: 16, t: 24, b: 44 },
                shapes: [{ type: "line", xref: "paper", x0: 0, x1: 1, y0: tm.other_midfielders_median, y1: tm.other_midfielders_median, line: { color: c.text, width: 1, dash: "dash" } }],
              }} />
              <figcaption className={styles.caption}>{tm.team}'s midfielders, with their minutes. Dashed: the median for midfielders at the other teams. {first} is in blue.</figcaption>
            </figure>
          </>
        )}
        <RankBlock row={row} player={rows.player} group="midfielders" />
        <p className={styles.caution}>
          <b>Can't tell:</b> {content.caution} It also cannot say whether he draws the ball to him or is simply the one his team plays through.
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
      {(cardReq.loading || (card && (rowsReq.loading || touchReq.loading))) && <p className={styles.muted}>Loading…</p>}
      {error && <p className={styles.error}>Could not load the example ({error}). Is the backend running?</p>}
      {body}
      <h2 className={styles.h2}>{ready ? "5" : "2"}. The code</h2>
      <p className={styles.muted}>Real code from the Playing at Speed project, copied as is.</p>
      {(CHAPTER_CODE["touches"] || []).map(cb => <CodeBlock key={cb.fn} {...cb} />)}
    </div>
  );
}
