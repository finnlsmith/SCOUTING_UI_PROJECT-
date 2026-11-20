import React from "react";
import { Link } from "react-router-dom";
import useApi from "../hooks/useApi";
import PlayerCard from "./PlayerCard";
import { CHAPTERS, chapterPath } from "./chapters";
import styles from "./PlayersPage.module.css";

const EXAMPLE_CARD = "enzo_fernandez";

const chapterLink = id => {
  const c = CHAPTERS.find(x => x.id === id);
  return <Link className={styles.link} to={chapterPath(id)}>{c.title}</Link>;
};

/**
 * "About the card": what the scouting card is and why it exists, with the real example card at the top.
 * The ideas come from the project's Notion page "THE PROCESS - PLAYING AT SPEED / WITH TIME".
 */
export default function AboutCardPage() {
  const { data: card, loading, error } = useApi(`/players/card/${EXAMPLE_CARD}`);

  return (
    <div>
      <h1 className={styles.title}>About the scouting card</h1>
      <p className={styles.intro}>
        A player card made of <b>process</b> stats: how a player plays, not what happened to him. Below is a real one.
        {card ? ` ${card.name}, 2022 World Cup, ${card.games} matches.` : ""} Click any row to see how it is made.
      </p>

      {loading && <p className={styles.muted}>Loading the card…</p>}
      {error && <p className={styles.error}>Could not load the card ({error}). Is the backend running?</p>}
      {card && <PlayerCard card={card} />}

      <h2 className={styles.h2}>What the card is</h2>
      <ul className={styles.rules}>
        <li>Goals and assists describe a result. They depend on the team, the chances and luck. The card keeps them in one strip at the top and puts the rest of the page on <b>how the player gets there</b>.</li>
        <li>Every other row is a rate or a share that can be measured from tracking and event data: how fast he is moving when he acts, how much time he has, what he does with it.</li>
        <li>Each row is ranked against players in the same position group, so a midfielder is never ranked against strikers.</li>
      </ul>

      <h2 className={styles.h2}>The idea: playing at speed</h2>
      <p className={styles.explain}>
        Playing at speed is the speed the ball travels with, and the number of touches it takes to cover the ground. The less of either, the less the opposition can get a foot in.
        This came from watching Champions League football. It is a <b>hypothesis, not a finding</b>.
      </p>
      <p className={styles.explain}>
        Three coaches' ideas sit behind it. Bielsa: the ball is faster than any player, so a team that moves it well creates space, and the modern player must think faster than he runs.
        Xabi Alonso: the ability to receive in the phone booth, with an opponent next to you. Shankly: the time to judge a player is when he has time on the ball.
      </p>
      <p className={styles.explain}>
        The higher the level, the less time a player has to decide and the harder the ball arrives. So a number from a quiet league can hide a problem that shows up one level
        up. Results are slow to show this. Process stats may show it earlier.
      </p>

      <h2 className={styles.h2}>Two questions, one card</h2>
      <dl className={styles.parts}>
        <div>
          <dt>What does he do at speed?</dt>
          <dd>
            Running (the share of actions at 15+ km/h, "pace"), first-time play and passing at speed ("tempo"), and receiving under pressure:
            {" "}{chapterLink("pace")}, {chapterLink("tempo-and-technique")}, {chapterLink("phone-booth")}.
          </dd>
        </div>
        <div>
          <dt>What does he do with time?</dt>
          <dd>
            How much time the game gives him, and whether he makes it count when he has it:
            {" "}{chapterLink("time-on-ball")}, {chapterLink("free-space")}, {chapterLink("ball-holding")}.
          </dd>
        </div>
        <div>
          <dt>How much is just athleticism?</dt>
          <dd>
            The flip side: how many of his good actions depend on being faster than the defender. That is not a reason to pass on a player, but it
            ties his success to his legs. {chapterLink("flip-side")}.
          </dd>
        </div>
        <div>
          <dt>Is he where the job needs him?</dt>
          <dd>
            Touches and shots in the places his position needs: {chapterLink("touches")}, {chapterLink("goal-side")}, {chapterLink("action-volume")}.
          </dd>
        </div>
      </dl>

      <h2 className={styles.h2}>How to read a row</h2>
      <ul className={styles.rules}>
        <li><b>The bar and the number in the box</b> are the percentile: 50 means he is level with the middle of the peer group, 90 means he is above nine in ten.</li>
        <li><b>The value</b> on the right is the real number the percentile comes from, such as a rate per 90 or a share of his actions.</li>
        <li><b>The 90% range and the event count</b> say how firm it is. A rate built on a handful of events can move a lot from one match.</li>
        <li><b>Settled</b> means he has played enough matches for the number to stop moving much. Hatched rows are not settled, and "too few events to rank" is left unranked.</li>
        <li><b>Teal, amber, grey.</b> Teal is strong, amber is weak, and grey rows describe style or context and are not good or bad.</li>
        <li><b>Attempts count as well as completions.</b> A player who tries the hard pass and sometimes misses is not the same as one who never tries, so the card shows both.</li>
      </ul>

      <h2 className={styles.h2}>What it cannot say</h2>
      <ul className={styles.rules}>
        <li>{card ? `${card.games} matches` : "A few matches"} at one tournament is a small sample. That is why rows carry a settled flag.</li>
        <li>The card describes how a player played in this data. It does not show that his style causes results, or that it would carry over to another team or league. That is a hypothesis.</li>
        <li>Some of the stats the idea calls for need tracking of the ball itself: how fast it arrives, and how many touches he takes to do something. They are not on the card yet.</li>
        <li>One number can have more than one cause. A slower dribble could mean a slower player or less pressure on him. Each chapter says what its row cannot separate.</li>
      </ul>

      <h2 className={styles.h2}>Where the data comes from</h2>
      <p className={styles.explain}>
        PFF FC 2022 World Cup: event data plus player tracking for all 64 matches. Some rows only need events (touch counts, shots). Others need tracking
        (the player's speed at the moment of an action, who is within 3 m, how long he has on the ball). Each chapter shows which it uses, then the real code.
      </p>

      <h2 className={styles.h2}>The chapters</h2>
      <dl className={styles.parts}>
        {CHAPTERS.map(c => (
          <div key={c.id}>
            <dt><Link className={styles.link} to={chapterPath(c.id)}>{c.title}</Link></dt>
            <dd>{c.blurb}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
