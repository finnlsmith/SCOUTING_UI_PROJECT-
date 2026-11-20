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

const LABELS = {
  shots: "Shots attempted, per 90", crosses: "Crosses attempted, per 90", lb: "Line-breaking passes, per 90",
  lbok: "Line-breaking pass completion", crok: "Cross completion",
};

/** Chapter: Action volume. */
export default function ActionVolumePage() {
  const chapter = chapterById("action-volume");
  const content = CHAPTER_CONTENT["action-volume"];
  const { isDark } = useTheme();
  const c = chartColors(isDark);
  const cardReq = useApi("/players/card/enzo_fernandez");
  const card = cardReq.data;
  const id = card ? card.pff_player_id : null;
  const rowsReq = useApi(id ? `/players/${id}/rows` : null);
  const volReq = useApi(id ? `/players/${id}/volume` : null);
  const error = cardReq.error || rowsReq.error || volReq.error;
  const rows = rowsReq.data, v = volReq.data;
  const ready = card && rows && v;
  const first = card ? card.name.split(" ")[0] : "";
  const row = key => rows.rows.find(r => r.label === LABELS[key]);

  let body = null;
  if (ready) {
    const section = card.sections.find(s => s.title === "Action volume");
    const p = v.passing, comp = v.completion, a = v.attempts;
    const ORANGE = isDark ? "#f0a35a" : "#d9731a";
    const names = [first, "the midfielders"];

    // the picture: where he attempted
    const pts = v.points;
    const plain = pts.filter(q => q.action === "pass" && !q.lines_broken);
    const lb = pts.filter(q => q.action === "pass" && q.lines_broken);
    const lbDone = lb.filter(q => q.success), lbMiss = lb.filter(q => !q.success);
    const shots = pts.filter(q => q.action === "shot"), crosses = pts.filter(q => q.action === "cross");
    const pic = [
      { x: plain.map(q => q.x_att), y: plain.map(q => q.y_att), type: "scatter", mode: "markers", name: "other passes", marker: { size: 5, color: c.slow, opacity: 0.35 }, hoverinfo: "skip" },
      { x: lbDone.map(q => q.x_att), y: lbDone.map(q => q.y_att), type: "scatter", mode: "markers", name: "line-breaking pass, completed", marker: { size: 9, color: c.fast, opacity: 0.9, line: { color: c.text, width: 0.6 } },
        text: lbDone.map(q => `Broke line(s): ${q.lines_broken}`), hovertemplate: "%{text}<extra></extra>" },
      { x: lbMiss.map(q => q.x_att), y: lbMiss.map(q => q.y_att), type: "scatter", mode: "markers", name: "line-breaking pass, missed", marker: { size: 9, color: ORANGE, opacity: 0.95, line: { color: c.text, width: 0.6 } },
        text: lbMiss.map(q => `Broke line(s): ${q.lines_broken}`), hovertemplate: "%{text}<extra></extra>" },
      { x: shots.map(q => q.x_att), y: shots.map(q => q.y_att), type: "scatter", mode: "markers", name: "shot (size = xG)", marker: { size: shots.map(q => 11 + 120 * (q.xg || 0)), symbol: "diamond", color: "rgba(0,0,0,0)", line: { color: c.text, width: 2 } },
        text: shots.map(q => `xG ${q.xg}`), hovertemplate: "Shot, %{text}<extra></extra>" },
      { x: crosses.map(q => q.x_att), y: crosses.map(q => q.y_att), type: "scatter", mode: "markers", name: "cross", marker: { size: 11, symbol: "x", color: c.text, line: { width: 2, color: c.text } }, hovertemplate: "Cross<extra></extra>" },
    ].filter(t => t.x.length);

    const scatter = [
      { x: p.peers.filter(q => !q.me).map(q => q.p90), y: p.peers.filter(q => !q.me).map(q => q.share), type: "scatter", mode: "markers", name: "midfielders",
        marker: { size: 8, color: c.slow, opacity: 0.8 }, hovertemplate: "%{x:.1f} passes per 90, %{y:.1%} break a line<extra></extra>" },
      { x: [p.p90], y: [p.share], type: "scatter", mode: "markers+text", name: first, text: [first], textposition: "top center",
        marker: { size: 16, color: c.fast, line: { color: c.text, width: 1.5 } }, hovertemplate: `${first}: %{x:.1f} passes per 90, %{y:.1%} break a line<extra></extra>` },
    ];
    const g = comp.groups;
    const lineBars = [
      { x: g.map(q => `${q.group} (${q.n})`), y: g.map(q => q.rate), type: "bar", name: first, marker: { color: c.fast },
        text: g.map(q => (q.rate == null ? "" : pct(q.rate))), textposition: "outside", cliponaxis: false },
      { x: g.map(q => `${q.group} (${q.n})`), y: g.map(q => q.peer_rate), type: "bar", name: names[1], marker: { color: c.slow },
        text: g.map(q => pct(q.peer_rate)), textposition: "outside", cliponaxis: false },
    ];
    const midAtt = g.find(q => q.group === "Midfield line");
    const shotsRow = row("shots"), crossRow = row("crosses"), lbRow = row("lb"), lbokRow = row("lbok"), crokRow = row("crok");

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
        <p className={styles.explain}>Every open-play pass, shot and cross counts as an attempt, wherever it ends. A pass counts as line-breaking when PFF marks it as getting past at least one line of opposition players.</p>
        <figure className={styles.figure}>
          <PlotChart data={pic} height={400} layout={{
            xaxis: { range: [-56, 56], visible: false, scaleanchor: "y" }, yaxis: { range: [-37, 37], visible: false },
            shapes: pitchShapes(c.line), legend: { orientation: "h", y: -0.05 }, margin: { l: 4, r: 4, t: 4, b: 50 },
          }} />
          <figcaption className={styles.caption}>
            Where {first} was when he attempted each, across {card.games} matches, attacking left to right. Grey dots are his other {p.passes - p.lb} open-play passes; the coloured ones are his {p.lb} line-breaking passes.
          </figcaption>
        </figure>
        <p className={styles.explain}>All of his shots and crosses:</p>
        <div className={styles.tblWrap}>
          <table className={styles.tbl}>
            <thead><tr><th>Attempt</th><th>Match</th><th>Time</th><th>xG</th><th>Result</th></tr></thead>
            <tbody>
              {a.shot_list.map((s, i) => (
                <tr key={`s${i}`}>
                  <td>Shot</td><td>{s.match}</td><td>{s.clock}</td><td>{s.xg}</td>
                  <td className={s.goal ? styles.hit : ""}>{s.goal ? "goal" : s.success ? "on target" : "off target or blocked"}</td>
                </tr>
              ))}
              {a.cross_list.map((s, i) => (
                <tr key={`c${i}`}>
                  <td>Cross</td><td>{s.match}</td><td>{s.clock}</td><td>–</td><td className={s.success ? styles.hit : styles.miss}>{s.success ? "completed" : "missed"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className={styles.rules}>{content.measured.map(m => <li key={m}>{m}</li>)}</ul>

        <h2 className={styles.h2}>3. Why {first} gets these numbers</h2>

        <h3 className={styles.h3}>Shots attempted, per 90: {shotsRow.val}</h3>
        <Arithmetic row={shotsRow} player={rows.player} />
        <p className={styles.explain}>
          The midfielders' median is {a.median_shots90.toFixed(2)}, so he shoots more than most. They are low-value shots: his average xG is <b>{a.xg_per_shot.toFixed(3)}</b> against {a.peer_xg_per_shot.toFixed(3)} for midfielders' shots, {a.xg_total.toFixed(2)} in all from {a.shots}.
          His one goal came from a shot worth about 0.06.
        </p>
        <RankBlock row={shotsRow} player={rows.player} group="midfielders" />

        <h3 className={styles.h3}>Crosses attempted, per 90: {crossRow.val}</h3>
        <Arithmetic row={crossRow} player={rows.player} />
        <p className={styles.explain}>Two crosses in {Math.round(rows.player.minutes)} minutes (median {a.median_crosses90.toFixed(2)} per 90). One more or fewer would move the rank a lot.</p>
        <RankBlock row={crossRow} player={rows.player} group="midfielders" />

        <h3 className={styles.h3}>Line-breaking passes, per 90: {lbRow.val}</h3>
        <Arithmetic row={lbRow} player={rows.player} />
        <p className={styles.explain}>That count is how many passes he makes times how many of them break a line:</p>
        <Sum parts={[p.p90.toFixed(1), "passes per 90 ×", pct(p.share, 1), "of them break a line =", `${p.lb90.toFixed(1)} per 90`]} />
        <p className={styles.explain}>
          It is volume, not ambition. He passes far more than the midfielders (median {p.median_p90.toFixed(1)} per 90), but the share of his passes that break a line, {pct(p.share, 1)}, is the same as theirs ({pct(p.median_share, 1)}).
          On the median share he would have <b>{p.his_p90_on_median_share.toFixed(1)}</b> per 90. A median passer on his share would have <b>{p.median_p90_on_his_share.toFixed(1)}</b>.
        </p>
        <figure className={styles.figure}>
          <PlotChart data={scatter} height={320} layout={{
            xaxis: { title: "open-play passes per 90", gridcolor: c.grid }, yaxis: { title: "share that break a line", tickformat: ".0%", gridcolor: c.grid, rangemode: "tozero" },
            showlegend: false, margin: { l: 70, r: 16, t: 16, b: 48 },
            shapes: [{ type: "line", xref: "paper", x0: 0, x1: 1, y0: p.median_share, y1: p.median_share, line: { color: c.text, width: 1, dash: "dash" } }],
          }} />
          <figcaption className={styles.caption}>One dot per midfielder. Dashed: the median share. {first} is far to the right (many passes) and level with the median on share.</figcaption>
        </figure>
        <RankBlock row={lbRow} player={rows.player} group="midfielders" />

        <h3 className={styles.h3}>Line-breaking pass completion: {lbokRow.val}</h3>
        <Arithmetic row={lbokRow} player={rows.player} />
        <p className={styles.explain}>
          Which line a pass breaks matters. Midfielders complete {pct(g.find(q => q.group === "Attacking line").peer_rate)} of attacking-line breaks but only {pct(g.find(q => q.group === "Defensive line").peer_rate)} of defensive-line breaks.
          His mix does not explain his {pct(comp.his_rate, 1)} against their {pct(comp.peer_rate, 1)}: on the midfielders' mix of lines he would complete <b>{pct(comp.his_rates_peer_mix, 1)}</b>.
          The difference is in the midfield-line breaks, where he completes {pct(midAtt.rate)} of {midAtt.n} against {pct(midAtt.peer_rate)}. On ordinary passes he is level ({pct(comp.his_other_rate, 1)} against {pct(comp.peer_other_rate, 1)}).
        </p>
        <figure className={styles.figure}>
          <PlotChart data={lineBars} height={320} layout={{
            barmode: "group", xaxis: { gridcolor: c.grid, type: "category" }, yaxis: { title: "passes completed", tickformat: ".0%", gridcolor: c.grid, zeroline: false, rangemode: "tozero" },
            legend: { orientation: "h", y: 1.18 }, margin: { l: 64, r: 16, t: 36, b: 44 },
          }} />
          <figcaption className={styles.caption}>Completion by the line broken, with {first}'s number of passes in brackets. Defensive-line breaks are the hardest.</figcaption>
        </figure>
        <RankBlock row={lbokRow} player={rows.player} group="midfielders" />

        <h3 className={styles.h3}>Cross completion: {crokRow.val}</h3>
        <Arithmetic row={crokRow} player={rows.player} />
        <RankBlock row={crokRow} player={rows.player} group="midfielders" />

        <p className={styles.caution}>
          <b>Can't tell:</b> {content.caution} It also cannot say whether he could have attempted more: how often a midfielder shoots or crosses depends on his role and where his team plays.
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
      {(cardReq.loading || (card && (rowsReq.loading || volReq.loading))) && <p className={styles.muted}>Loading…</p>}
      {error && <p className={styles.error}>Could not load the example ({error}). Is the backend running?</p>}
      {body}
      <h2 className={styles.h2}>{ready ? "5" : "2"}. The code</h2>
      <p className={styles.muted}>Real code from the Playing at Speed project, copied as is.</p>
      {(CHAPTER_CODE["action-volume"] || []).map(cb => <CodeBlock key={cb.fn} {...cb} />)}
    </div>
  );
}
