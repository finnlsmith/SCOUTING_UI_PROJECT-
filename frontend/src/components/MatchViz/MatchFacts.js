import React from "react";
import Scoreboard from "../Scoreboard";
import styles from "./MatchViz.module.css";

const finite = Number.isFinite;
const present = v => v !== null && v !== undefined;

// "home - away" when both sides have a value, otherwise "-"
const pair = (home, away, ok = (a, b) => finite(a) && finite(b)) =>
  ok(home, away) ? `${home} - ${away}` : "-";

/** Match facts table: white numbers on a dark card. */
export default function MatchFacts({ stats: s }) {
  return (
    <div className={styles.matchFactsBlock}>
      <div className={styles.matchFactsCard}>
        <h2 className={styles.matchFactsTitle}>Match facts</h2>
        <Scoreboard
          stage={s.competition_stage}
          home={s.home_team}
          away={s.away_team}
          score={pair(s.home_score, s.away_score)}
          shots={pair(s.home_shots, s.away_shots, (a, b) => present(a) && present(b))}
          shotsOnTarget={pair(s.home_shots_on_target, s.away_shots_on_target, (a, b) => present(a) && present(b))}
          xg={pair(s.home_xg_sum, s.away_xg_sum, (a, b) => a && b)}
          bigChances={pair(s.home_big_chances, s.away_big_chances)}
          okChances={pair(s.home_ok_chances, s.away_ok_chances)}
          fouls={pair(s.home_fouls, s.away_fouls)}
          cardsLeft={cards(s, "home")}
          cardsRight={cards(s, "away")}
          boxEntries={pair(s.home_box_entries, s.away_box_entries)}
        />
      </div>
    </div>
  );
}

// "total (yellow/red)" for one side
function cards(s, side) {
  const total = s[`${side}_cards_total`];
  const yellow = s[`${side}_cards_yellow`];
  const red = s[`${side}_cards_red`];
  return finite(total) && finite(yellow) && finite(red) ? `${total} (${yellow}/${red})` : "-";
}
