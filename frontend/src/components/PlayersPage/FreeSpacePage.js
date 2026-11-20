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
  volume: "Free receptions per 100 team touches", share: "Touches taken in free space",
  prog: "Progressive (of free-space decisions)", lost: "Lost (of free-space decisions)", chances: "Chances from free space, per 90",
};
const KIND = { PA: "pass", CR: "cross", SH: "shot", BC: "carry", CH: "dribble or challenge", CL: "clearance", RE: "rebound", TC: "touch" };
const OUT = { positive: "progressive", neutral: "kept", negative: "lost", other: "other" };

/** Chapter: Free space. */
export default function FreeSpacePage() {
  const chapter = chapterById("free-space");
  const content = CHAPTER_CONTENT["free-space"];
  const { isDark } = useTheme();
  const c = chartColors(isDark);
  const cardReq = useApi("/players/card/enzo_fernandez");
  const card = cardReq.data;
  const id = card ? card.pff_player_id : null;
  const rowsReq = useApi(id ? `/players/${id}/rows` : null);
  const freeReq = useApi(id ? `/players/${id}/free` : null);
  const error = cardReq.error || rowsReq.error || freeReq.error;
  const rows = rowsReq.data, f = freeReq.data;
  const ready = card && rows && f;
  const first = card ? card.name.split(" ")[0] : "";
  const row = key => rows.rows.find(r => r.label === LABELS[key]);

  let body = null;
  if (ready) {
    const panels = card.sections.filter(s => s.rows.some(r => chapter.covers.includes(r.label)));
    const v = f.volume, z = f.zone, tm = f.team, o = Object.fromEntries(f.outcomes.map(x => [x.outcome, x]));
    const ORANGE = isDark ? "#f0a35a" : "#d9731a";
    const names = [first, "the midfielders"];
    const barLayout = (title, extra = {}) => ({
      barmode: "group", xaxis: { gridcolor: c.grid, type: "category" }, yaxis: { title, tickformat: ".0%", gridcolor: c.grid, zeroline: false, rangemode: "tozero" },
      legend: { orientation: "h", y: 1.18 }, margin: { l: 64, r: 16, t: 36, b: 44 }, ...extra,
    });
    const groupBars = (groups, lab = g => `${g.group} (${g.n})`) => [
      { x: groups.map(lab), y: groups.map(g => g.rate), type: "bar", name: names[0], marker: { color: c.fast },
        text: groups.map(g => (g.rate == null ? "" : pct(g.rate))), textposition: "outside", cliponaxis: false },
      { x: groups.map(lab), y: groups.map(g => g.peer_rate), type: "bar", name: names[1], marker: { color: c.slow },
        text: groups.map(g => pct(g.peer_rate)), textposition: "outside", cliponaxis: false },
    ];

    // the picture: all his touches, free ones coloured by what he did next
    const pts = f.points;
    const colour = { positive: c.fast, neutral: c.slow, negative: ORANGE, other: "rgba(0,0,0,0)" };
    const tight = pts.filter(p => !p.free);
    const pic = [
      { x: tight.map(p => p.x_att), y: tight.map(p => p.y_att), type: "scatter", mode: "markers", name: "touch with an opponent within 6 m", marker: { size: 5, color: c.slow, opacity: 0.3 }, hoverinfo: "skip" },
      ...["positive", "neutral", "negative", "other"].map(k => {
        const g = pts.filter(p => p.free && p.outcome === k);
        return { x: g.map(p => p.x_att), y: g.map(p => p.y_att), type: "scatter", mode: "markers", name: `free: ${OUT[k]}`,
          marker: { size: 9, color: colour[k], opacity: 0.9, line: { color: c.text, width: k === "other" ? 1.2 : 0.6 } },
          text: g.map(p => `Nearest opponent ${p.nearest_opp_m} m away`), hovertemplate: "%{text}<extra></extra>" };
      }),
    ].filter(t => t.x.length);

    const scatter = [
      { x: v.peers.filter(p => !p.me).map(p => p.involve), y: v.peers.filter(p => !p.me).map(p => p.share), type: "scatter", mode: "markers", name: "midfielders",
        marker: { size: 8, color: c.slow, opacity: 0.8 }, hovertemplate: "%{x:.1f} touches per 100 team touches, %{y:.0%} in free space<extra></extra>" },
      { x: [v.involve], y: [v.share], type: "scatter", mode: "markers+text", name: first, text: [first], textposition: "top center",
        marker: { size: 16, color: c.fast, line: { color: c.text, width: 1.5 } }, hovertemplate: `${first}: %{x:.1f} touches per 100 team touches, %{y:.0%} in free space<extra></extra>` },
    ];
    const mates = tm ? tm.midfielders : [];
    const mateBars = [{
      x: mates.map(m => `${m.name.split(" ").slice(-1)[0]} (${m.touches})`), y: mates.map(m => m.share), type: "bar",
      marker: { color: mates.map(m => (m.me ? c.fast : c.slow)) }, text: mates.map(m => pct(m.share)), textposition: "outside", cliponaxis: false,
    }];
    const outBars = [
      { x: f.outcomes.map(x => x.outcome), y: f.outcomes.map(x => x.rate), type: "bar", name: names[0], marker: { color: c.fast },
        text: f.outcomes.map(x => pct(x.rate)), textposition: "outside", cliponaxis: false },
      { x: f.outcomes.map(x => x.outcome), y: f.outcomes.map(x => x.peer_rate), type: "bar", name: names[1], marker: { color: c.slow },
        text: f.outcomes.map(x => pct(x.peer_rate)), textposition: "outside", cliponaxis: false },
    ];
    const volRow = row("volume"), shareRow = row("share"), progRow = row("prog"), lostRow = row("lost"), chRow = row("chances");

    body = (
      <>
        <h2 className={styles.h2}>1. On the card</h2>
        {panels.map(p => (
          <div key={p.title} className={styles.cardMini}>
            <CardFrame><div className={styles.cardMiniPad}>
              <Panel title={p.title} sub={p.sub} rows={p.rows} games={card.games} linkRows={false} highlightLabel={chapter.covers} />
            </div></CardFrame>
          </div>
        ))}
        <dl className={styles.parts}>
          {chapter.covers.map(l => <div key={l}><dt>{l}</dt><dd>{content.means[l]}</dd></div>)}
        </dl>

        <h2 className={styles.h2}>2. How it is measured</h2>
        <p className={styles.explain}>A touch is free when the nearest opponent is 6 m or more away as he gets the ball. The outcome of each free touch is what he did next.</p>
        <figure className={styles.figure}>
          <PlotChart data={pic} height={400} layout={{
            xaxis: { range: [-56, 56], visible: false, scaleanchor: "y" }, yaxis: { range: [-37, 37], visible: false },
            shapes: pitchShapes(c.line), legend: { orientation: "h", y: -0.05 }, margin: { l: 4, r: 4, t: 4, b: 50 },
          }} />
          <figcaption className={styles.caption}>
            Each coloured dot is one of {first}'s {v.free} free touches across {card.games} matches, attacking left to right; colour is what he did next. The small grey dots are his other {v.known - v.free} touches, with an opponent within 6 m.
            Hollow dots are clearances and loose touches, which are left out of the three shares.
          </figcaption>
        </figure>
        <p className={styles.explain}>Eight of his free touches, from {f.example_match}:</p>
        <div className={styles.tblWrap}>
          <table className={styles.tbl}>
            <thead><tr><th>Part of the pitch</th><th>Nearest opponent</th><th>Then</th><th>Outcome</th></tr></thead>
            <tbody>
              {f.examples.map((e, i) => (
                <tr key={i}>
                  <td>{e.zone}</td><td>{e.space_m} m</td><td>{KIND[e.last_kind] || e.last_kind}</td>
                  <td className={e.outcome === "negative" ? styles.miss : e.outcome === "positive" ? styles.hit : ""}>{OUT[e.outcome]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className={styles.rules}>{content.measured.map(m => <li key={m}>{m}</li>)}</ul>

        <h2 className={styles.h2}>3. Why {first} gets these numbers</h2>

        <h3 className={styles.h3}>Free receptions per 100 team touches: {volRow.val}</h3>
        <Sum parts={[v.involve.toFixed(1), "of his team's touches are his ×", pct(v.share, 1), "of them in free space =", `${v.per100.toFixed(1)} per 100`]} />
        <p className={styles.explain}>
          {content.how["Free receptions per 100 team touches"]} It splits into how involved he is and how often that involvement is in space.
          He is more involved than the midfielders (median {v.median_involve.toFixed(1)} per 100) and in free space far more often (median {pct(v.median_share, 1)}).
          On the median share he would have <b>{v.his_involve_on_median_share.toFixed(1)}</b>; a median-involvement player on his share would have <b>{v.median_involve_on_his_share.toFixed(1)}</b>. Mostly it is the share.
        </p>
        <figure className={styles.figure}>
          <PlotChart data={scatter} height={320} layout={{
            xaxis: { title: "his touches per 100 team touches", gridcolor: c.grid }, yaxis: { title: "share of his touches in free space", tickformat: ".0%", gridcolor: c.grid, rangemode: "tozero" },
            showlegend: false, margin: { l: 70, r: 16, t: 16, b: 48 },
            shapes: [{ type: "line", xref: "paper", x0: 0, x1: 1, y0: v.median_share, y1: v.median_share, line: { color: c.text, width: 1, dash: "dash" } }],
          }} />
          <figcaption className={styles.caption}>One dot per midfielder. Dashed: the median free-space share. {first} is high on both.</figcaption>
        </figure>
        <RankBlock row={volRow} player={rows.player} group="midfielders" />

        <h3 className={styles.h3}>Touches taken in free space: {shareRow.val}</h3>
        <Arithmetic row={shareRow} player={rows.player} />
        <p className={styles.explain}>
          <b>Is it where on the pitch?</b> The final third is tighter than the middle. On the midfielders' mix of pitch areas he would be at <b>{pct(z.his_rates_peer_mix, 1)}</b>, against his actual {pct(z.his_rate, 1)}: no. He has more free touches than the midfielders in every part of the pitch.
        </p>
        <figure className={styles.figure}>
          <PlotChart data={groupBars(z.groups)} height={300} layout={barLayout("touches in free space")} />
          <figcaption className={styles.caption}>Share of touches taken in free space, by part of the pitch, with {first}'s number of touches in brackets.</figcaption>
        </figure>
        {tm && (
          <>
            <p className={styles.explain}>
              <b>Is it his team?</b> Partly. {tm.team} gives its players {pct(tm.share, 1)} of touches in free space, {tm.rank}th of {tm.teams} teams (median {pct(tm.median_team_share, 1)}). Three of its four midfielders are above the other teams' midfielders (median {pct(tm.other_midfielders_median, 1)}), but not the fourth:
            </p>
            <figure className={styles.figure}>
              <PlotChart data={mateBars} height={280} layout={{
                xaxis: { gridcolor: c.grid, type: "category" }, yaxis: { title: "touches in free space", tickformat: ".0%", gridcolor: c.grid, zeroline: false, rangemode: "tozero" },
                showlegend: false, margin: { l: 64, r: 16, t: 24, b: 44 },
                shapes: [{ type: "line", xref: "paper", x0: 0, x1: 1, y0: tm.other_midfielders_median, y1: tm.other_midfielders_median, line: { color: c.text, width: 1, dash: "dash" } }],
              }} />
              <figcaption className={styles.caption}>{tm.team}'s midfielders, with their number of touches in brackets. Dashed: the median for midfielders at the other teams. {first} is in blue.</figcaption>
            </figure>
          </>
        )}
        <RankBlock row={shareRow} player={rows.player} group="midfielders" />

        <h3 className={styles.h3}>What he does with the space</h3>
        <p className={styles.explain}>
          He keeps the ball more and moves it on less. Of his {o.Progressive.n} free-space decisions, {pct(o.Kept.rate, 1)} were kept (midfielders {pct(o.Kept.peer_rate, 1)}), {pct(o.Progressive.rate, 1)} progressive ({pct(o.Progressive.peer_rate, 1)}) and {pct(o.Lost.rate, 1)} lost ({pct(o.Lost.peer_rate, 1)}).
        </p>
        <figure className={styles.figure}>
          <PlotChart data={outBars} height={300} layout={barLayout("share of decisions")} />
          <figcaption className={styles.caption}>What happened after a free-space touch: {first} against the midfielders the card compares him with.</figcaption>
        </figure>
        <p className={styles.explain}>
          <b>Is it where he is, or how much room?</b> On the midfielders' mix of pitch areas, or of how much space there was (6 to 9 m, 9 to 12 m, 12+ m), his progressive rate stays at {pct(f.tests.zone.positive.his_rates_peer_mix, 1)} and {pct(f.tests.space.positive.his_rates_peer_mix, 1)} (actual {pct(o.Progressive.rate, 1)}, midfielders {pct(o.Progressive.peer_rate, 1)}).
          His lost rate stays at {pct(f.tests.zone.negative.his_rates_peer_mix, 1)} and {pct(f.tests.space.negative.his_rates_peer_mix, 1)}. He progresses less in every part of the pitch:
        </p>
        <figure className={styles.figure}>
          <PlotChart data={groupBars(f.tables.zone)} height={300} layout={barLayout("free touches that progress")} />
          <figcaption className={styles.caption}>Progressive share of free-space decisions by part of the pitch, with {first}'s number of decisions in brackets.</figcaption>
        </figure>

        <h3 className={styles.h3}>Progressive (of free-space decisions): {progRow.val}</h3>
        <Arithmetic row={progRow} player={rows.player} />
        <RankBlock row={progRow} player={rows.player} group="midfielders" />

        <h3 className={styles.h3}>Lost (of free-space decisions): {lostRow.val}</h3>
        <Arithmetic row={lostRow} player={rows.player} />
        <RankBlock row={lostRow} player={rows.player} group="midfielders" />

        <h3 className={styles.h3}>Chances from free space, per 90: {chRow.val}</h3>
        <Arithmetic row={chRow} player={rows.player} />
        <div className={styles.tblWrap}>
          <table className={styles.tbl}>
            <thead><tr><th>Chance</th><th>Match</th><th>Space</th></tr></thead>
            <tbody>{f.chances.map((x, i) => <tr key={i}><td>{x.kind}</td><td>{x.match}</td><td>{x.space_m} m</td></tr>)}</tbody>
          </table>
        </div>
        <p className={styles.explain}>All of them: three chances in {Math.round(rows.player.minutes)} minutes, so one more or fewer moves the rank a lot.</p>
        <RankBlock row={chRow} player={rows.player} group="midfielders" />

        <p className={styles.caution}>
          <b>Can't tell:</b> {content.caution} It also cannot say whether he keeps the ball in space by choice or because the progressive pass was not on, and 240 decisions is not many.
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
      {(cardReq.loading || (card && (rowsReq.loading || freeReq.loading))) && <p className={styles.muted}>Loading…</p>}
      {error && <p className={styles.error}>Could not load the example ({error}). Is the backend running?</p>}
      {body}
      <h2 className={styles.h2}>{ready ? "5" : "2"}. The code</h2>
      <p className={styles.muted}>Real code from the Playing at Speed project, copied as is.</p>
      {(CHAPTER_CODE["free-space"] || []).map(cb => <CodeBlock key={cb.fn} {...cb} />)}
    </div>
  );
}
