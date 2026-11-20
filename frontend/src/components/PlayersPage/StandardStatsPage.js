import React from "react";
import useApi from "../hooks/useApi";
import { useTheme } from "../../contexts/ThemeContext";
import { CardFrame, Panel } from "./PlayerCard";
import { chapterById } from "./chapters";
import { CHAPTER_CONTENT } from "./chapterContent";
import { CHAPTER_CODE } from "./chapterCode";
import { Arithmetic, RankBlock } from "./chapterBits";
import PlotChart, { chartColors } from "./PlotChart";
import { TryAnother } from "./ChapterPage";
import CodeBlock from "./CodeBlock";
import styles from "./PlayersPage.module.css";

const ONE = { Goals: "goal", Assists: "assist", "Key passes": "key pass", "High-xG shots": "high-xG shot" };
const MANY = { Goals: "goals", Assists: "assists", "Key passes": "key passes", "High-xG shots": "high-xG shots" };

/** One stat: the sum, how the midfielders' counts are spread, what one more or fewer would do, and the ranking. */
function StatBlock({ stat, row, rows, first, pool, c }) {
  const bars = [{
    x: stat.distribution.map(d => d.bucket), y: stat.distribution.map(d => d.n), type: "bar",
    marker: { color: stat.distribution.map(d => (d.me ? c.fast : c.slow)) },
    text: stat.distribution.map(d => d.n), textposition: "outside", cliponaxis: false, hovertemplate: "%{x}: %{y} midfielders<extra></extra>",
  }];
  const others = stat.distribution.filter(d => d.bucket !== "0" && d.n > 0);
  const small = stat.name !== "key passes";
  return (
    <div>
      <h3 className={styles.h3}>{stat.label}: {stat.count}</h3>
      <Arithmetic row={row} player={rows.player} />
      <p className={styles.explain}>
        {small
          ? <>{stat.zero} of the {pool} midfielders have no {MANY[stat.label]}. {others.map(d => `${d.n} have ${d.bucket === "3+" ? "three or more" : d.bucket === "1" ? "one" : "two"}`).join(", ")}.
              {" "}So {stat.count} {stat.count === 1 ? ONE[stat.label] : MANY[stat.label]} puts {first} among the {pool - stat.zero} who have any, ranked by how few minutes it took.</>
          : <>The median midfielder has {stat.median_count.toFixed(0)} key passes (mean {stat.mean_count.toFixed(1)}), the most is {stat.max}, and {stat.zero} have none. {first} has {stat.count}.</>}
      </p>
      <figure className={styles.figure}>
        <PlotChart data={bars} height={240} layout={{
          xaxis: { title: `${MANY[stat.label]} in the tournament`, type: "category", gridcolor: c.grid }, yaxis: { title: "midfielders", gridcolor: c.grid, zeroline: false, rangemode: "tozero" },
          showlegend: false, margin: { l: 56, r: 16, t: 24, b: 48 },
        }} />
        <figcaption className={styles.caption}>How many of the {pool} midfielders have each count. {first}'s is in blue.</figcaption>
      </figure>
      <div className={styles.tblWrap}>
        <table className={styles.tbl}>
          <thead><tr><th>If he had {small ? MANY[stat.label] : "made"}</th>{stat.what_if.map(w => <th key={w.count}>{w.count}{w.actual ? " (actual)" : ""}</th>)}</tr></thead>
          <tbody><tr><td>His percentile would be</td>{stat.what_if.map(w => <td key={w.count} className={w.actual ? styles.hit : ""}>{w.percentile}</td>)}</tr></tbody>
        </table>
      </div>
      <RankBlock row={row} player={rows.player} group="midfielders" />
    </div>
  );
}

/** Chapter: Standard stats. */
export default function StandardStatsPage() {
  const chapter = chapterById("standard-stats");
  const content = CHAPTER_CONTENT["standard-stats"];
  const { isDark } = useTheme();
  const c = chartColors(isDark);
  const cardReq = useApi("/players/card/enzo_fernandez");
  const card = cardReq.data;
  const id = card ? card.pff_player_id : null;
  const rowsReq = useApi(id ? `/players/${id}/rows` : null);
  const stdReq = useApi(id ? `/players/${id}/standard` : null);
  const error = cardReq.error || rowsReq.error || stdReq.error;
  const rows = rowsReq.data, s = stdReq.data;
  const ready = card && rows && s;
  const first = card ? card.name.split(" ")[0] : "";

  let body = null;
  if (ready) {
    const panel = { title: "Standard stats", sub: "the numbers everyone quotes",
      rows: card.std.map(x => ({ label: x.label, val: x.big, pct: x.pct, judge: true, settled: true, np: false, meta: x.sub })) };
    const rowOf = label => rows.rows.find(r => r.label === label);
    const goals = s.stats.find(x => x.label === "Goals");

    body = (
      <>
        <h2 className={styles.h2}>1. On the card</h2>
        <div className={styles.cardMini}>
          <CardFrame><div className={styles.cardMiniPad}>
            <Panel title={panel.title} sub={panel.sub} rows={panel.rows} games={card.games} linkRows={false} highlightLabel={chapter.covers} />
          </div></CardFrame>
        </div>
        <dl className={styles.parts}>
          {chapter.covers.map(l => <div key={l}><dt>{l}</dt><dd>{content.means[l]}</dd></div>)}
        </dl>

        <h2 className={styles.h2}>2. How it is measured</h2>
        <p className={styles.explain}>The four stats are counted from {first}'s shots and key passes. These are the {s.events.length} events behind them: his 7 key passes, his goal and his high-xG shot.</p>
        <div className={styles.tblWrap}>
          <table className={styles.tbl}>
            <thead><tr><th>Match</th><th>Time</th><th>What</th><th>Counts as</th><th>xG</th></tr></thead>
            <tbody>
              {s.events.map((e, i) => (
                <tr key={i}>
                  <td>{e.match}</td><td>{e.clock}</td><td>{e.kind}</td>
                  <td className={e.tags ? styles.hit : ""}>{e.tags ? e.tags : e.kind === "key pass" ? "key pass" : "–"}</td>
                  <td>{e.xg == null ? "–" : e.xg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className={styles.rules}>{content.measured.map(m => <li key={m}>{m}</li>)}</ul>

        <h2 className={styles.h2}>3. Why {first} gets these numbers</h2>
        <p className={styles.explain}>
          All four are small counts, so what matters is how the other midfielders' counts are spread. Most have none of the first three. A percentile also gives tied players half credit each:
          with {goals.zero} of {s.pool_size} midfielders on zero goals, having none would still put a player at the <b>{goals.what_if[0].percentile}th</b> percentile, not the first.
        </p>
        {s.stats.map(stat => (
          <StatBlock key={stat.label} stat={stat} row={rowOf(stat.label)} rows={rows} first={first} pool={s.pool_size} c={c} />
        ))}
        <p className={styles.explain}>
          <b>Goals against what the shots were worth.</b> His {s.xg.shots} shots were worth {s.xg.xg_total.toFixed(2)} xG in total, so a typical player would score about {s.xg.xg_total.toFixed(1)} from them. He scored {s.xg.goals}, {Math.abs(s.xg.goals - s.xg.xg_total).toFixed(2)} {s.xg.goals >= s.xg.xg_total ? "more" : "fewer"} than that, and one goal is what the 81st percentile rests on.
          {" "}{s.xg.high_xg_shots} of the {s.xg.shots} was a high-xG chance (0.15 or more).
        </p>
        <p className={styles.caution}>
          <b>Can't tell:</b> {content.caution} A single goal or assist moves the percentile by ten to twenty points, so these rows say little about how good he is at scoring or creating. They do show he was involved: seven key passes is among the most of any midfielder.
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
      {(cardReq.loading || (card && (rowsReq.loading || stdReq.loading))) && <p className={styles.muted}>Loading…</p>}
      {error && <p className={styles.error}>Could not load the example ({error}). Is the backend running?</p>}
      {body}
      <h2 className={styles.h2}>{ready ? "5" : "2"}. The code</h2>
      <p className={styles.muted}>Real code from the Playing at Speed project, copied as is.</p>
      {(CHAPTER_CODE["standard-stats"] || []).map(cb => <CodeBlock key={cb.fn} {...cb} />)}
    </div>
  );
}
