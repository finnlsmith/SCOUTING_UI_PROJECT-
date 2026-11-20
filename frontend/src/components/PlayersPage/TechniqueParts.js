import React from "react";
import { CardFrame, Panel } from "./PlayerCard";
import styles from "./PlayersPage.module.css";

const LABELS = {
  one_touch: "Played first time (tempo)", kept: "First touch kept", ft_pass: "First-time pass completion",
  pass: "Pass completion", pass_fast: "Pass completion at 15+ km/h",
};
export const ROW_LABELS = Object.values(LABELS);
const PRESSURE = { N: "none", L: "light", P: "pressure", A: "attempted" };
const num = n => Number(n).toLocaleString("en-GB");
const first = name => name.split(" ")[0];

/** "1. On the card": the Technique block with the five rows highlighted, one line each. */
export function TechniqueOnCard({ card, tech }) {
  const section = card.sections.find(s => s.title === "Technique");
  const r = Object.fromEntries(tech.rows.map(x => [x.key, x]));
  const f = first(card.name);
  return (
    <div>
      <p className={styles.lead}>Five rows of the <b>Technique</b> block are covered here. The sixth, chances from free space, is in the Free space chapter.</p>
      <div className={styles.cardMini}>
        <CardFrame>
          <div className={styles.cardMiniPad}>
            <Panel title={section.title} sub={section.sub} rows={section.rows} games={card.games} linkRows={false} highlightLabel={ROW_LABELS} />
          </div>
        </CardFrame>
      </div>
      <dl className={styles.parts}>
        <div><dt>{LABELS.one_touch}</dt><dd>Of the passes he received, how many he played in one touch. {r.one_touch.k} of {num(r.one_touch.n)}.</dd></div>
        <div><dt>{LABELS.kept}</dt><dd>How often his first touch did not let the pass down. {r.kept.k} of {num(r.kept.n)}.</dd></div>
        <div><dt>{LABELS.ft_pass}</dt><dd>When he played it first time and then passed, how often the pass was completed. {r.ft_pass.k} of {r.ft_pass.n}.</dd></div>
        <div><dt>{LABELS.pass}</dt><dd>Passes completed. {r.pass.k} of {r.pass.n}.</dd></div>
        <div><dt>{LABELS.pass_fast}</dt><dd>The same, only for passes he made while moving at 15 km/h or faster. {r.pass_fast.k} of {r.pass_fast.n}.</dd></div>
      </dl>
      <p className={styles.muted}>
        Reading each row (value, percentile box, bar, 90% range, events, settled) is the same as in the Pace chapter. {f}'s numbers are on the card above.
      </p>
    </div>
  );
}

/** "2. How it is measured": real receptions, and the rule for each row. */
export function TechniqueMeasured({ card, tech }) {
  const f = first(card.name);
  const kinds = tech.failed.kinds.slice(0, 5).map(k => k.how).join(", ");
  return (
    <div>
      <p className={styles.explain}>
        Every pass he received is one row. Here are {f}'s first {tech.examples.length} in {tech.example_match}:
      </p>
      <div className={styles.tblWrap}>
        <table className={styles.tbl}>
          <thead>
            <tr><th>Time</th><th>Passed by</th><th>Pressure on him</th><th>Touches</th><th>First touch</th><th>Then</th></tr>
          </thead>
          <tbody>
            {tech.examples.map((e, i) => (
              <tr key={i}>
                <td>{e.clock}</td>
                <td>{e.passer}</td>
                <td>{PRESSURE[e.pressure] || "–"}</td>
                <td className={e.touches === 1 ? styles.hit : ""}>{e.touches}</td>
                <td className={e.failed_how ? styles.miss : ""}>{e.failed_how || "kept"}</td>
                <td>
                  {e.next_action === "pass"
                    ? `pass, ${e.next_pass_complete === true ? "completed" : e.next_pass_complete === false ? "missed" : "result unknown"}`
                    : "not a pass"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className={styles.rules}>
        <li><b>Played first time:</b> Touches = 1.</li>
        <li><b>First touch kept:</b> not a failed reception. A failure is any of: {kinds}, and similar.</li>
        <li><b>First-time pass completion:</b> receptions with one touch that end in a pass; the share of those passes completed.</li>
        <li><b>Pass completion:</b> every pass he made, completed or not. The 15+ km/h row counts only passes made at that speed (speed measured as in the Pace chapter).</li>
      </ul>
      <p className={styles.muted}>
        Only usable events count: open play, a real flight time, both players on camera, a known arrival speed. That is why {f} has {tech.rows[0].n} receptions on the card, not every pass he received.
      </p>
    </div>
  );
}
