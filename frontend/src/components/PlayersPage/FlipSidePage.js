import React from "react";
import useApi from "../hooks/useApi";
import { useTheme } from "../../contexts/ThemeContext";
import { CardFrame, Panel } from "./PlayerCard";
import { chapterById } from "./chapters";
import { CHAPTER_CONTENT } from "./chapterContent";
import { CHAPTER_CODE } from "./chapterCode";
import { Arithmetic, RankBlock, Sum, pct, num } from "./chapterBits";
import PlotChart, { chartColors, pitchShapes } from "./PlotChart";
import { TryAnother } from "./ChapterPage";
import CodeBlock from "./CodeBlock";
import styles from "./PlayersPage.module.css";

const LABELS = {
  rec: "Ball recoveries per 90", final: "Final-third recoveries per 90",
  duel: "Duel win rate", fast: "Win rate vs fast carriers (15+ km/h)",
};
const HOW = { interception: "interception", pass: "other pass he picked up", touch: "loose touch", clearance: "clearance (second ball)", shot: "shot that came back" };

/** Chapter: Flip side and recoveries. */
export default function FlipSidePage() {
  const chapter = chapterById("flip-side");
  const content = CHAPTER_CONTENT["flip-side"];
  const { isDark } = useTheme();
  const c = chartColors(isDark);
  const cardReq = useApi("/players/card/enzo_fernandez");
  const card = cardReq.data;
  const id = card ? card.pff_player_id : null;
  const rowsReq = useApi(id ? `/players/${id}/rows` : null);
  const flipReq = useApi(id ? `/players/${id}/flip` : null);
  const error = cardReq.error || rowsReq.error || flipReq.error;
  const rows = rowsReq.data, f = flipReq.data;
  const ready = card && rows && f;
  const first = card ? card.name.split(" ")[0] : "";
  const row = key => rows.rows.find(r => r.label === LABELS[key]);

  let body = null;
  if (ready) {
    const section = card.sections.find(s => s.title.startsWith("Flip side"));
    const r = f.recoveries, fin = f.final, d = f.duel;
    const ORANGE = isDark ? "#f0a35a" : "#d9731a";
    const names = [first, "the midfielders"];
    const barLayout = (title, extra = {}) => ({
      barmode: "group", xaxis: { gridcolor: c.grid, type: "category" }, yaxis: { title, tickformat: ".0%", gridcolor: c.grid, zeroline: false, rangemode: "tozero" },
      legend: { orientation: "h", y: 1.18 }, margin: { l: 64, r: 16, t: 36, b: 44 }, ...extra,
    });

    // the picture: his recoveries on the pitch
    const style = { interception: { color: c.fast, symbol: "circle" }, pass: { color: ORANGE, symbol: "circle" },
      touch: { color: c.slow, symbol: "circle" }, clearance: { color: c.text, symbol: "circle-open" }, shot: { color: c.text, symbol: "x" } };
    const pic = f.sources.keys.map(k => {
      const pts = f.recovery_points.filter(p => p.source === k);
      return { x: pts.map(p => p.x_att), y: pts.map(p => p.y_att), type: "scatter", mode: "markers", name: HOW[k],
        marker: { size: 11, color: style[k].color, symbol: style[k].symbol, opacity: 0.9, line: { color: c.text, width: 0.8 } },
        text: pts.map(p => p.match), hovertemplate: `${HOW[k]}<br>%{text}<extra></extra>` };
    }).filter(t => t.x.length);
    const finalZone = { type: "rect", x0: 17.5, x1: 52.5, y0: -34, y1: 34, fillcolor: isDark ? "rgba(154,160,255,0.13)" : "rgba(59,70,224,0.10)", line: { width: 0 }, layer: "below" };

    // recoveries per 90: busy opponents x rate
    const peers = r.peers.filter(p => !p.me);
    const scatter = [
      { x: peers.map(p => p.opp90), y: peers.map(p => p.rec90), type: "scatter", mode: "markers", name: "midfielders", marker: { size: 8, color: c.slow, opacity: 0.8 },
        hovertemplate: "%{x:.0f} opponent touches per 90, %{y:.1f} recoveries per 90<extra></extra>" },
      { x: [r.opp90], y: [r.per90], type: "scatter", mode: "markers+text", name: first, text: [first], textposition: "top center",
        marker: { size: 16, color: c.fast, line: { color: c.text, width: 1.5 } }, hovertemplate: `${first}: %{x:.0f} opponent touches per 90, %{y:.1f} recoveries per 90<extra></extra>` },
    ];

    // where he recovers
    const thirds = f.thirds;
    const thirdBars = [
      { x: thirds.labels.map(l => `${l} (${thirds.player_n[l]})`), y: thirds.labels.map(l => thirds.player[l]), type: "bar", name: first, marker: { color: c.fast },
        text: thirds.labels.map(l => pct(thirds.player[l])), textposition: "outside", cliponaxis: false },
      { x: thirds.labels.map(l => `${l} (${thirds.player_n[l]})`), y: thirds.labels.map(l => thirds.peers[l]), type: "bar", name: names[1], marker: { color: c.slow },
        text: thirds.labels.map(l => pct(thirds.peers[l])), textposition: "outside", cliponaxis: false },
    ];

    // duels by challenge and by carrier speed
    const ch = f.by_challenge;
    const chBars = [
      { x: ch.map(g => `${g.challenge} (${g.n})`), y: ch.map(g => g.rate), type: "bar", name: first, marker: { color: c.fast },
        text: ch.map(g => (g.rate == null ? "" : pct(g.rate))), textposition: "outside", cliponaxis: false },
      { x: ch.map(g => `${g.challenge} (${g.n})`), y: ch.map(g => g.peer_rate), type: "bar", name: names[1], marker: { color: c.slow },
        text: ch.map(g => pct(g.peer_rate)), textposition: "outside", cliponaxis: false },
    ];
    const sp = f.by_speed;
    const spBars = [
      { x: sp.map(g => `${g.band} km/h (${g.n})`), y: sp.map(g => g.rate), type: "bar", name: first, marker: { color: c.fast },
        text: sp.map(g => (g.rate == null ? "" : pct(g.rate))), textposition: "outside", cliponaxis: false },
      { x: sp.map(g => `${g.band} km/h (${g.n})`), y: sp.map(g => g.peer_rate), type: "bar", name: names[1], marker: { color: c.slow },
        text: sp.map(g => (g.peer_rate == null ? "" : pct(g.peer_rate))), textposition: "outside", cliponaxis: false },
    ];
    const recRow = row("rec"), finRow = row("final"), duelRow = row("duel"), fastRow = row("fast");
    const gapTotal = r.median_per90 - r.per90;
    const gapOpp = r.median_per90 - r.median_rate_on_his_opps;

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
        <p className={styles.explain}>A recovery is the moment his team gets the ball back and he is the one on it. The shaded area is the opponent's final third.</p>
        <figure className={styles.figure}>
          <PlotChart data={pic} height={380} layout={{
            xaxis: { range: [-56, 56], visible: false, scaleanchor: "y" }, yaxis: { range: [-37, 37], visible: false },
            shapes: [finalZone, ...pitchShapes(c.line)], legend: { orientation: "h", y: -0.03 }, margin: { l: 4, r: 4, t: 4, b: 40 },
          }} />
          <figcaption className={styles.caption}>Each dot is one of {first}'s {r.n} recoveries across {card.games} matches, attacking left to right. Colour is how he got the ball: {pct(f.sources.player.interception)} are interceptions (midfielders: {pct(f.sources.peers.interception)}).</figcaption>
        </figure>
        <p className={styles.explain}>His {d.fast_n} duels against fast carriers, fastest first. "Win chance" is what the expected-win model gives an average defender in that duel.</p>
        <div className={styles.tblWrap}>
          <table className={styles.tbl}>
            <thead><tr><th>Carrier</th><th>Challenge</th><th>Carrier speed</th><th>Win chance</th><th>Result</th></tr></thead>
            <tbody>
              {f.fast_duels.map((e, i) => (
                <tr key={i}>
                  <td>{e.attacker_name}</td><td>{e.challenge}</td><td>{e.att_spd} km/h</td><td>{pct(e.p_exp)}</td>
                  <td className={e.defender_won ? styles.hit : styles.miss}>{e.defender_won ? "won" : "lost"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className={styles.rules}>{content.measured.map(m => <li key={m}>{m}</li>)}</ul>

        <h2 className={styles.h2}>3. Why {first} gets these numbers</h2>

        <h3 className={styles.h3}>Ball recoveries per 90: {recRow.val}</h3>
        <Arithmetic row={recRow} player={rows.player} />
        <p className={styles.explain}>A recovery needs the opponent to have the ball first. So per 90 is how much the opponent had it while he was on, times how often he won it:</p>
        <Sum parts={[num(Math.round(r.opp90)), "opponent touches per 90 ×", r.per100.toFixed(2), "recoveries per 100 =", `${r.per90.toFixed(1)} per 90`]} />
        <p className={styles.explain}>
          Argentina had the ball more, so opponents touched it {Math.round(r.opp90)} times per 90 while he was on (midfielders: {Math.round(r.median_opp90)}), and he won {r.per100.toFixed(2)} per 100 (midfielders: {r.median_per100.toFixed(2)}).
          That gap of {gapTotal.toFixed(1)} per 90 splits in two. On his opportunities a median midfielder would have <b>{r.median_rate_on_his_opps.toFixed(1)}</b>, so about {gapOpp.toFixed(1)} is opportunity. On the median opportunity he would have <b>{r.his_rate_on_median_opps.toFixed(1)}</b>. The rest is how often he wins it.
        </p>
        <figure className={styles.figure}>
          <PlotChart data={scatter} height={320} layout={{
            xaxis: { title: "opponent touches per 90 while on the pitch", gridcolor: c.grid }, yaxis: { title: "recoveries per 90", gridcolor: c.grid, rangemode: "tozero" },
            showlegend: false, margin: { l: 64, r: 16, t: 16, b: 48 },
          }} />
          <figcaption className={styles.caption}>One dot per midfielder. {first} has fewer chances than most, and a slightly lower recovery rate on them.</figcaption>
        </figure>
        <RankBlock row={recRow} player={rows.player} group="midfielders" />

        <h3 className={styles.h3}>Final-third recoveries per 90: {finRow.val}</h3>
        <Sum parts={[r.per90.toFixed(1), "recoveries per 90 ×", pct(fin.share, 1), "of them in the final third =", `${fin.per90.toFixed(2)} per 90`]} />
        <p className={styles.explain}>
          Two things at once: fewer recoveries, and fewer of them up the pitch. Only {fin.n} of his {r.n} are in the final third ({pct(fin.share, 1)}; midfielders {pct(fin.peer_share, 1)}).
          With his recoveries but the midfielders' share he would have <b>{fin.his_recs_peer_share.toFixed(1)}</b>; a median midfielder on his share would have <b>{fin.median_recs_his_share.toFixed(1)}</b>.
        </p>
        <figure className={styles.figure}>
          <PlotChart data={thirdBars} height={300} layout={barLayout("share of recoveries")} />
          <figcaption className={styles.caption}>Where the recoveries happen, with {first}'s number of recoveries in brackets.</figcaption>
        </figure>
        <RankBlock row={finRow} player={rows.player} group="midfielders" />

        <h3 className={styles.h3}>Duel win rate: {duelRow.val}</h3>
        <Arithmetic row={duelRow} player={rows.player} />
        <p className={styles.explain}>
          Duels are not equal, so the expected-win model sets a bar: from the carrier's speed, the type of challenge, where it happened and his role, an average defender would win <b>{d.expected_wins.toFixed(1)}</b> of these {d.n}. He won {d.wins}, so <b>{d.above_expected.toFixed(1)} more</b> than expected.
          By type he does best in dribble and tackle duels:
        </p>
        <figure className={styles.figure}>
          <PlotChart data={chBars} height={300} layout={barLayout("duels won")} />
          <figcaption className={styles.caption}>Win rate by type of challenge, with {first}'s number of duels in brackets.</figcaption>
        </figure>
        <RankBlock row={duelRow} player={rows.player} group="midfielders" />

        <h3 className={styles.h3}>Win rate vs fast carriers: {fastRow.val}</h3>
        <Arithmetic row={fastRow} player={rows.player} />
        <p className={styles.explain}>
          Fast carriers are harder to stop: the midfielders win {pct(d.peer_fast_rate, 1)} of those duels and {pct(d.peer_slower_rate, 1)} of the rest. The model expects an average defender to win <b>{d.fast_expected.toFixed(1)}</b> of {first}'s {d.fast_n}; he won {d.fast_wins}, <b>{(d.fast_wins - d.fast_expected).toFixed(1)} more</b>.
          His split by speed is uneven, because the groups are tiny:
        </p>
        <figure className={styles.figure}>
          <PlotChart data={spBars} height={300} layout={barLayout("duels won")} />
          <figcaption className={styles.caption}>Win rate by how fast the carrier was moving, with {first}'s number of duels in brackets.</figcaption>
        </figure>
        <RankBlock row={fastRow} player={rows.player} group="midfielders" />

        <p className={styles.caution}>
          <b>Can't tell:</b> {content.caution} Who faces fast carriers is not a player trait (it does not repeat from match to match); it depends on the opponent and the situation, which is why the model sets the bar. A recovery can also be position, not skill: a midfielder who stands where the ball falls looks like a ball-winner.
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
      {(cardReq.loading || (card && (rowsReq.loading || flipReq.loading))) && <p className={styles.muted}>Loading…</p>}
      {error && <p className={styles.error}>Could not load the example ({error}). Is the backend running?</p>}
      {body}
      <h2 className={styles.h2}>{ready ? "5" : "2"}. The code</h2>
      <p className={styles.muted}>Real code from the Playing at Speed project, copied as is.</p>
      {(CHAPTER_CODE["flip-side"] || []).map(cb => <CodeBlock key={cb.fn} {...cb} />)}
    </div>
  );
}
