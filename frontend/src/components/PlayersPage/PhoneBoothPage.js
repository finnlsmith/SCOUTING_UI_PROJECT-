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

const KIND = { PA: "pass", CR: "cross", SH: "shot", BC: "carry", CH: "dribble or challenge", CL: "clearance", RE: "rebound", TC: "touch" };
const OUT = { positive: "progressive", neutral: "kept", negative: "lost", other: "other" };
const PRESSURE = { N: "none", L: "light", P: "pressure", A: "attempted" };
const ZONE = { x0: -17.5, x1: 27.5 };

/** Chapter: Phone booth. Starts from the card, shows the booth, then why Enzo's numbers are what they are. */
export default function PhoneBoothPage() {
  const chapter = chapterById("phone-booth");
  const content = CHAPTER_CONTENT["phone-booth"];
  const { isDark } = useTheme();
  const c = chartColors(isDark);
  const cardReq = useApi("/players/card/enzo_fernandez");
  const card = cardReq.data;
  const id = card ? card.pff_player_id : null;
  const rowsReq = useApi(id ? `/players/${id}/rows` : null);
  const boothReq = useApi(id ? `/players/${id}/booth` : null);
  const error = cardReq.error || rowsReq.error || boothReq.error;
  const rows = rowsReq.data, b = boothReq.data;
  const ready = card && rows && b;
  const first = card ? card.name.split(" ")[0] : "";
  const row = label => rows.rows.find(r => r.label === label);

  let body = null;
  if (ready) {
    const section = card.sections.find(s => s.title === "Phone booth");
    const v = b.volume;
    const lostTest = b.tests;
    const out = Object.fromEntries(b.outcomes.map(o => [o.outcome, o]));
    const ORANGE = isDark ? "#f0a35a" : "#d9731a";
    const colour = { positive: c.fast, neutral: c.slow, negative: ORANGE, other: "rgba(0,0,0,0)" };

    // the picture: the zone and his booth touches
    const pic = ["positive", "neutral", "negative", "other"].map(o => {
      const ts = b.touches.filter(t => t.outcome === o);
      return {
        x: ts.map(t => t.x_att), y: ts.map(t => t.y_att), type: "scatter", mode: "markers", name: OUT[o],
        marker: { size: 11, color: colour[o], line: { color: o === "other" ? c.text : c.text, width: o === "other" ? 1.5 : 0.8 }, opacity: 0.9 },
        text: ts.map(t => `${t.match}<br>${KIND[t.last_kind] || t.last_kind}, opponent ${t.nearest_opp_m} m away`),
        hovertemplate: "%{text}<extra></extra>",
      };
    });
    const zoneShape = { type: "rect", x0: ZONE.x0, x1: ZONE.x1, y0: -34, y1: 34, fillcolor: isDark ? "rgba(154,160,255,0.13)" : "rgba(59,70,224,0.10)", line: { width: 0 }, layer: "below" };

    // volume: busy, but few touches in the booth
    const peers = v.peers.filter(p => !p.me);
    const scatter = [
      { x: peers.map(p => p.t90), y: peers.map(p => p.share), type: "scatter", mode: "markers", name: "midfielders",
        marker: { size: 8, color: c.slow, opacity: 0.8 }, hovertemplate: "%{x:.1f} touches per 90, %{y:.1%} in the booth<extra></extra>" },
      { x: [v.t90], y: [v.share], type: "scatter", mode: "markers+text", name: first, text: [first], textposition: "top center",
        marker: { size: 16, color: c.fast, line: { color: c.text, width: 1.5 } }, hovertemplate: `${first}: %{x:.1f} touches per 90, %{y:.1%} in the booth<extra></extra>` },
    ];

    // outcomes: his shares against the peers'
    const names = [first, "the midfielders"];
    const bars = [
      { x: b.outcomes.map(o => o.outcome), y: b.outcomes.map(o => o.rate), type: "bar", name: names[0], marker: { color: c.fast },
        text: b.outcomes.map(o => pct(o.rate)), textposition: "outside", cliponaxis: false },
      { x: b.outcomes.map(o => o.outcome), y: b.outcomes.map(o => o.peer_rate), type: "bar", name: names[1], marker: { color: c.slow },
        text: b.outcomes.map(o => pct(o.peer_rate)), textposition: "outside", cliponaxis: false },
    ];
    const zone = b.tables.zone || [];
    const zoneBars = [
      { x: zone.map(g => `${g.group} (${g.n})`), y: zone.map(g => g.rate), type: "bar", name: first, marker: { color: c.fast },
        text: zone.map(g => pct(g.rate)), textposition: "outside", cliponaxis: false },
      { x: zone.map(g => `${g.group} (${g.n})`), y: zone.map(g => g.peer_rate), type: "bar", name: names[1], marker: { color: c.slow },
        text: zone.map(g => pct(g.peer_rate)), textposition: "outside", cliponaxis: false },
    ];
    const FACTORS = [["zone", "Where in the booth he receives"], ["closeness", "How close the opponent is"], ["pressure", "PFF's pressure code"], ["phase", "Phase of play"]];
    const barLayout = (title, extra = {}) => ({
      barmode: "group", xaxis: { gridcolor: c.grid }, yaxis: { title, tickformat: ".0%", gridcolor: c.grid, zeroline: false, rangemode: "tozero" },
      legend: { orientation: "h", y: 1.18 }, margin: { l: 64, r: 16, t: 36, b: 40 }, ...extra,
    });
    const volRow = row("Receptions in the booth, per 90");

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
        <p className={styles.explain}>The booth is the shaded zone. A touch counts when an opponent is within 3 m as he gets the ball.</p>
        <figure className={styles.figure}>
          <PlotChart data={pic} height={380} layout={{
            xaxis: { range: [-56, 56], visible: false, scaleanchor: "y" }, yaxis: { range: [-37, 37], visible: false },
            shapes: [zoneShape, ...pitchShapes(c.line)], legend: { orientation: "h", y: -0.03 }, margin: { l: 4, r: 4, t: 4, b: 34 },
          }} />
          <figcaption className={styles.caption}>
            Each dot is one of {first}'s {v.booth} booth touches across {card.games} matches, attacking left to right. Colour is what he did next. Hollow dots are clearances and loose touches, which are not counted in the three shares.
          </figcaption>
        </figure>
        <p className={styles.explain}>Eight of them as rows, from {b.example_match}:</p>
        <div className={styles.tblWrap}>
          <table className={styles.tbl}>
            <thead><tr><th>Opponent within</th><th>Pressure code</th><th>Then</th><th>Gain</th><th>Outcome</th></tr></thead>
            <tbody>
              {b.examples.map((e, i) => (
                <tr key={i}>
                  <td>{e.nearest_opp_m} m</td><td>{PRESSURE[e.pressure] || "–"}</td>
                  <td>{KIND[e.last_kind] || e.last_kind}{e.last_kind === "PA" ? (e.completed === true ? ", completed" : e.completed === false ? ", missed" : "") : ""}</td>
                  <td>{e.gain_m == null ? "–" : `${e.gain_m} m`}</td>
                  <td className={e.outcome === "negative" ? styles.miss : e.outcome === "positive" ? styles.hit : ""}>{OUT[e.outcome]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className={styles.rules}>{content.measured.map(m => <li key={m}>{m}</li>)}</ul>

        <h2 className={styles.h2}>3. Why {first} gets these numbers</h2>
        <h3 className={styles.h3}>Receptions in the booth, per 90: {volRow.val}</h3>
        <Arithmetic row={volRow} player={rows.player} />
        <p className={styles.explain}>
          That count is his touches per 90 times the share of his touches that land in the booth:
        </p>
        <Sum parts={[v.t90.toFixed(1), "touches per 90 ×", pct(v.share, 1), "in the booth =", `${v.b90.toFixed(1)} per 90`]} />
        <p className={styles.explain}>
          He is one of the busiest midfielders (median {v.median_t90.toFixed(1)} touches per 90), but only {pct(v.share, 1)} of his touches come in the booth (median {pct(v.median_share, 1)}; {v.share_below} of the {v.pool_size} are lower).
          On the median share he would have <b>{v.his_touches_on_median_share.toFixed(1)}</b> per 90. A median-touch player on his share would have <b>{v.median_touches_on_his_share.toFixed(1)}</b>.
        </p>
        <figure className={styles.figure}>
          <PlotChart data={scatter} height={320} layout={{
            xaxis: { title: "touches per 90", gridcolor: c.grid }, yaxis: { title: "share of touches in the booth", tickformat: ".0%", gridcolor: c.grid, rangemode: "tozero" },
            showlegend: false, margin: { l: 70, r: 16, t: 16, b: 48 },
            shapes: [{ type: "line", xref: "paper", x0: 0, x1: 1, y0: v.median_share, y1: v.median_share, line: { color: c.text, width: 1, dash: "dash" } }],
          }} />
          <figcaption className={styles.caption}>One dot per midfielder. Dashed: the median booth share. {first} is high on the left-right axis and near the bottom: busy, but mostly away from tight spaces.</figcaption>
        </figure>
        <RankBlock row={volRow} player={rows.player} group="midfielders" />

        <h3 className={styles.h3}>Progressive, kept, lost</h3>
        <p className={styles.explain}>
          On {out.Progressive.n} decisions he progresses the ball less often than the midfielders ({pct(out.Progressive.rate, 1)} against {pct(out.Progressive.peer_rate, 1)}) and loses it more often ({pct(out.Lost.rate, 1)} against {pct(out.Lost.peer_rate, 1)}).
        </p>
        <figure className={styles.figure}>
          <PlotChart data={bars} height={300} layout={barLayout("share of decisions")} />
          <figcaption className={styles.caption}>What happened after he received the ball in the booth: {first} against the midfielders the card compares him with.</figcaption>
        </figure>

        <p className={styles.explain}>
          <b>Is it where or how he receives?</b> Booths differ: a tight spot deep in the zone is harder than one further forward. So I gave him each factor's mix from the other midfielders and kept his own loss rates. If the factor explained it, his lost rate would fall towards {pct(out.Lost.peer_rate)}.
        </p>
        <div className={styles.tblWrap}>
          <table className={styles.tbl}>
            <thead><tr><th>If he faced the midfielders' mix of…</th><th>His lost rate would be</th></tr></thead>
            <tbody>
              {FACTORS.filter(([k]) => lostTest[k]).map(([k, label]) => (
                <tr key={k}><td>{label}</td><td>{pct(lostTest[k].negative.his_rates_peer_mix, 1)}</td></tr>
              ))}
              <tr><td><b>His actual lost rate</b></td><td><b>{pct(out.Lost.rate, 1)}</b></td></tr>
              <tr><td>The midfielders' lost rate</td><td>{pct(out.Lost.peer_rate, 1)}</td></tr>
            </tbody>
          </table>
        </div>
        <p className={styles.explain}>
          It barely moves, so none of the four explains it. He loses it more in the deep and middle parts of the booth; the advanced part, where he has only a few decisions, is the exception.
        </p>
        <figure className={styles.figure}>
          <PlotChart data={zoneBars} height={300} layout={barLayout("share lost")} />
          <figcaption className={styles.caption}>Lost rate by part of the booth, with {first}'s number of decisions in brackets. Deep: behind halfway. Middle: up to 12 m past it. Advanced: beyond that.</figcaption>
        </figure>

        {["Progressive (of decisions)", "Kept, no progress", "Lost"].map(l => {
          const r = row(l);
          return (
            <div key={l}>
              <h3 className={styles.h3}>{l}: {r.val}</h3>
              <Arithmetic row={r} player={rows.player} />
              <RankBlock row={r} player={rows.player} group="midfielders" />
            </div>
          );
        })}
        <p className={styles.caution}>
          <b>Can't tell:</b> why he loses it more here. It could be his role, where his teammates stand, or the opponent. Sixty decisions is also few, which is why these rows are not settled.
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
      {(cardReq.loading || (card && (rowsReq.loading || boothReq.loading))) && <p className={styles.muted}>Loading…</p>}
      {error && <p className={styles.error}>Could not load the example ({error}). Is the backend running?</p>}
      {body}
      <h2 className={styles.h2}>{ready ? "5" : "2"}. The code</h2>
      <p className={styles.muted}>Real code from the Playing at Speed project, copied as is.</p>
      {(CHAPTER_CODE["phone-booth"] || []).map(cb => <CodeBlock key={cb.fn} {...cb} />)}
    </div>
  );
}
