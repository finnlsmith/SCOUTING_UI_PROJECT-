import React from "react";
import { CardFrame, Panel } from "./PlayerCard";
import styles from "./PlayersPage.module.css";

const PACE_LABEL = "Actions at 15+ km/h (pace)";
const num = n => Number(n).toLocaleString("en-GB");

/** "1. On the card": the pace row in its place on the card, each part explained in a line. */
export default function PaceOnCard({ card, pace }) {
  const section = card.sections.find(s => s.rows.some(r => r.label === PACE_LABEL));
  const row = section.rows.find(r => r.label === PACE_LABEL);
  const p = pace.player;
  const group = pace.peer_group.name === "Midfielders" ? "midfielders" : "attackers";

  return (
    <div>
      <p className={styles.lead}>Pace is one row in the <b>{section.title}</b> block.</p>

      <div className={styles.cardMini}>
        <CardFrame>
          <div className={styles.cardMiniPad}>
            <Panel title={section.title} sub={section.sub} rows={section.rows} games={card.games} linkRows={false} highlightLabel={PACE_LABEL} />
          </div>
        </CardFrame>
      </div>

      <dl className={styles.parts}>
        <div>
          <dt>{row.label}</dt>
          <dd>Of all his actions with the ball, how many were at 15 km/h or faster.</dd>
        </div>
        <div>
          <dt>{row.val} <span className={styles.partTag}>number on the right</span></dt>
          <dd>{p.act_fast} of his {num(p.act_n)} actions.</dd>
        </div>
        <div>
          <dt>{row.pct} <span className={styles.partTag}>box by the bar</span></dt>
          <dd>Percentile among {pace.peer_group.size} {group}: {row.pct}% of them have a lower pace share.</dd>
        </div>
        <div>
          <dt>Grey bar</dt>
          <dd>The percentile as a length, with lines at 25, 50 and 75. Grey because pace is style, not quality.</dd>
        </div>
        <div>
          <dt>90% range {row.rng} <span className={styles.partTag}>under the label</span></dt>
          <dd>Where his true share likely sits. Narrow because {num(row.n)} actions is a lot.</dd>
        </div>
        <div>
          <dt>{num(row.n)} events <span className={styles.partTag}>under the label</span></dt>
          <dd>Actions with a usable speed. {pace.actions_unknown_speed} more had none (off camera or a tracking gap) and are left out.</dd>
        </div>
        <div>
          <dt>{row.settled ? "Settled" : "Not settled"} <span className={styles.partTag}>under the label</span></dt>
          <dd>Needs {row.need} matches for the number to hold steady. He has {card.games}.</dd>
        </div>
      </dl>
    </div>
  );
}
