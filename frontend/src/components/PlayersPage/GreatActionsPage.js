import React, { useState } from "react";
import { Link } from "react-router-dom";
import useApi from "../hooks/useApi";
import { useTheme } from "../../contexts/ThemeContext";
import { CardFrame, GreatActions } from "./PlayerCard";
import { CHAPTER_CODE } from "./chapterCode";
import PlotChart, { chartColors } from "./PlotChart";
import CodeBlock from "./CodeBlock";
import styles from "./PlayersPage.module.css";

const NAME = { goals: "Goals", assists: "Assists", "key passes": "Key passes", "high-xg shots": "High-xG shots" };
const label = a => {
  const k = a.replace(/ \(.*/, "").toLowerCase();
  return NAME[k] || k[0].toUpperCase() + k.slice(1);
};
const reading = (v, unit) => (v == null ? <span className={styles.muted}>no reading</span> : `${v}${unit}`);

/** Same card table for any midfielder, with their counts underneath. */
function TryAnother({ peers, defaultId }) {
  const list = useApi("/players/rows/players");
  const [picked, setPicked] = useState(null);
  const players = (list.data || []).filter(p => p.peers === peers);
  const id = picked != null && players.some(p => p.pff_player_id === picked) ? picked : defaultId;
  const g = useApi(id ? `/players/${id}/great` : null);
  const word = peers === "Midfielders" ? "midfielders" : "attackers";
  if (list.loading) return <p className={styles.muted}>Loading players…</p>;
  if (list.error) return <p className={styles.error}>Could not load players ({list.error}).</p>;
  return (
    <div>
      <label className={styles.pickerLabel}>
        Player{" "}
        <select className={styles.picker} aria-label="Select a player" value={id ?? ""} onChange={e => setPicked(Number(e.target.value))}>
          {players.map(x => <option key={x.pff_player_id} value={x.pff_player_id}>{x.name}</option>)}
        </select>
      </label>
      <p className={styles.muted}>{word[0].toUpperCase() + word.slice(1)} with 4+ matches, as on the cards.</p>
      {g.error && <p className={styles.error}>Could not load this player ({g.error}).</p>}
      {g.data && (
        <div className={styles.cardMini} style={{ maxWidth: 980 }}>
          <CardFrame><div className={styles.cardMiniPad}><GreatActions card={{ great: { rows: g.data.rows } }} /></div></CardFrame>
        </div>
      )}
    </div>
  );
}

/** Chapter: Great actions. The card's table, every event behind it, and how far his splits differ from everyone's. */
export default function GreatActionsPage({ chapter }) {
  const { isDark } = useTheme();
  const c = chartColors(isDark);
  const cardReq = useApi("/players/card/enzo_fernandez");
  const card = cardReq.data;
  const id = card ? card.pff_player_id : null;
  const greatReq = useApi(id ? `/players/${id}/great` : null);
  const g = greatReq.data;
  const error = cardReq.error || greatReq.error;
  const first = card ? card.name.split(" ")[0] : "";
  const ready = card && g;

  let body = null;
  if (ready) {
    const kp = g.splits.filter(s => s.action === "key passes");
    const withData = kp.filter(s => s.share != null);
    const chart = [
      { x: withData.map(s => s.label), y: withData.map(s => s.share), type: "scatter", mode: "markers+text", name: first,
        marker: { size: 14, color: c.fast, line: { color: c.text, width: 1.5 } },
        error_y: { type: "data", symmetric: false, array: withData.map(s => s.range[1] - s.share), arrayminus: withData.map(s => s.share - s.range[0]), color: c.fast, thickness: 2, width: 8 },
        text: withData.map(s => `${s.k} of ${s.known}`), textposition: "middle right", textfont: { color: c.text },
        hovertemplate: "%{x}: %{y:.0%}<extra></extra>" },
      { x: kp.map(s => s.label), y: kp.map(s => s.ref_share), type: "scatter", mode: "markers", name: "all players' key passes",
        marker: { size: 12, symbol: "diamond", color: "rgba(0,0,0,0)", line: { color: c.text, width: 2 } }, hovertemplate: "All players: %{y:.0%}<extra></extra>" },
    ];
    const byAction = Object.fromEntries(g.rows.map(r => [label(r.action), r]));
    const eventOf = tag => g.events.find(e => e.tags.includes(tag));
    const goal = eventOf("goal"), assist = eventOf("assist"), highXg = eventOf("high xG");
    const unknownKp = kp.reduce((o, s) => ({ ...o, [s.split]: s.unknown }), {});
    const describe = e => (e.speed_kmh == null && e.nearest_m == null && e.time_on_ball == null
      ? "no speed, space or time reading, because tracking was not usable at that moment"
      : `${e.speed_kmh ?? "unknown"} km/h, nearest defender ${e.nearest_m ?? "unknown"} m, ${e.time_on_ball ?? "unknown"} s on the ball`);
    const allInside = withData.every(s => s.ref_share >= s.range[0] && s.ref_share <= s.range[1]);

    body = (
      <>
        <h2 className={styles.h2}>1. On the card</h2>
        <p className={styles.lead}>This table is the card's third view. It shows counts, not percentiles: one player has too few of these to rank.</p>
        <div className={styles.cardMini} style={{ maxWidth: 980 }}>
          <CardFrame><div className={styles.cardMiniPad}><GreatActions card={{ great: { rows: g.rows } }} /></div></CardFrame>
        </div>
        <ul className={styles.rules}>
          <li><b>The thick bar</b> is {first}; the <b>thin bar</b> underneath is every World Cup player's actions of that kind.</li>
          <li><b>Three splits</b> for each action: speed, space and time on the ball. Hatched means no reading.</li>
        </ul>

        <h2 className={styles.h2}>2. How it is measured</h2>
        <p className={styles.explain}>
          Each great action is one event, and each event gets three readings from tracking at that moment. These are all of {first}'s {g.events.length} events: his 8 shots and his 7 key passes. A shot counts as a goal or a high-xG shot (naive xG 0.15 or more); a key pass counts as an assist if the shot went in.
        </p>
        <div className={styles.tblWrap}>
          <table className={styles.tbl}>
            <thead><tr><th>Match</th><th>Time</th><th>What</th><th>Counts as</th><th>Speed</th><th>Nearest defender</th><th>Time on the ball</th></tr></thead>
            <tbody>
              {g.events.map((e, i) => (
                <tr key={i}>
                  <td>{e.match}</td><td>{e.clock}</td><td>{e.kind}{e.xg != null ? ` (xG ${e.xg})` : ""}</td>
                  <td className={e.tags ? styles.hit : ""}>{e.tags || "–"}</td>
                  <td>{reading(e.speed_kmh, " km/h")}</td><td>{reading(e.nearest_m, " m")}</td><td>{reading(e.time_on_ball, " s")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className={styles.rules}>
          <li><b>Speed:</b> how fast he was moving when he did it: under 15 km/h or 15+ km/h (measured as in the <Link to="/players/pace" className={styles.link}>Pace</Link> chapter).</li>
          <li><b>Space:</b> the nearest defender at the action. Two bands, because 72% of goals and 87% of high-xG shots come with a defender within 3 m, so a "free" band would read as zeros.</li>
          <li><b>Time:</b> time on the ball before the nearest opponent could reach him: under 1.5 s, 1.5 to 3 s, 3+ s (see <Link to="/players/time-on-ball" className={styles.link}>Time on the ball</Link>).</li>
          <li><b>No reading:</b> the player has to be on camera with usable tracking at that moment. It is missing for many events, and they are shown as unknown, not dropped.</li>
        </ul>

        <h2 className={styles.h2}>3. Why {first}'s table looks the way it does</h2>
        <p className={styles.explain}>
          <b>The counts</b> are what he did: {byAction.Goals.me.total} goal, {byAction.Assists.me.total} assist, {byAction["Key passes"].me.total} key passes, {byAction["High-xG shots"].me.total} high-xG shot. How those compare with other midfielders, per 90 minutes, is in the <Link to="/players/standard-stats" className={styles.link}>Standard stats</Link> chapter.
        </p>
        <p className={styles.explain}>
          <b>The splits</b> are mostly gaps. Only the key passes have enough events to say anything, and even they are thin: of his {byAction["Key passes"].me.total} key passes, {unknownKp.speed} have no speed reading, {unknownKp.space} no space reading and {unknownKp.time} no time reading.
        </p>
        <figure className={styles.figure}>
          <PlotChart data={chart} height={340} layout={{
            xaxis: { type: "category", gridcolor: c.grid }, yaxis: { title: "share of key passes", tickformat: ".0%", range: [-0.05, 1.05], gridcolor: c.grid, zeroline: false },
            legend: { orientation: "h", y: 1.15 }, margin: { l: 70, r: 40, t: 36, b: 44 },
          }} />
          <figcaption className={styles.caption}>
            Of the key passes that have a reading, the share at speed, with a defender within 3 m, and under 1.5 s on the ball: {first} (blue, with the 90% range and "k of n known") against all players' key passes (diamond).
          </figcaption>
        </figure>
        <p className={styles.explain}>
          {allInside ? "Every range contains the all-players figure, so his key passes look like everyone's." : "Some ranges miss the all-players figure."}
          {" "}On speed he has {kp.find(s => s.split === "speed").k} at 15+ km/h of only {kp.find(s => s.split === "speed").known} known, which matches what the Pace chapter found about his actions in general (about 10% at pace), but two readings cannot show it.
        </p>
        <ul className={styles.rules}>
          {goal && <li><b>The goal</b> ({goal.match}, {goal.clock}): {describe(goal)}.</li>}
          {assist && <li><b>The assist</b> ({assist.match}, {assist.clock}): {describe(assist)}.</li>}
          {highXg && <li><b>The high-xG shot</b> ({highXg.match}, {highXg.clock}, xG {highXg.xg}): {describe(highXg)}.</li>}
        </ul>
        <p className={styles.caution}>
          <b>Can't tell:</b> with 1, 1, 7 and 1 actions, and readings missing on many of them, the splits are anecdotes, not a style. High-xG uses a simple model of distance and angle, because PFF has no xG field.
        </p>

        <h2 className={styles.h2}>4. Try another midfielder</h2>
        <TryAnother peers="Midfielders" defaultId={id} />
      </>
    );
  }

  return (
    <div>
      <h1 className={styles.title}>{chapter.title}</h1>
      <p className={styles.intro}>
        Goals, assists, key passes and high-xG shots, and how each one happened: how fast, how tight, how much time. Data: PFF FC, 2022 World Cup.
      </p>
      {(cardReq.loading || (card && greatReq.loading)) && <p className={styles.muted}>Loading…</p>}
      {error && <p className={styles.error}>Could not load the example ({error}). Is the backend running?</p>}
      {body}
      <h2 className={styles.h2}>{ready ? "5" : "2"}. The code</h2>
      <p className={styles.muted}>Real code from the Playing at Speed project, copied as is.</p>
      {(CHAPTER_CODE["great-actions"] || []).map(cb => <CodeBlock key={cb.fn} {...cb} />)}
    </div>
  );
}
