import React from "react";
import { Link, useParams } from "react-router-dom";
import { chapterById } from "./chapters";
import styles from "./PlayersPage.module.css";

/** Placeholder for a chapter that is not written yet. Says plainly what it will cover. */
export default function ComingSoonPage() {
  const { chapter: id } = useParams();
  const chapter = chapterById(id);

  if (!chapter) {
    return (
      <div>
        <h1 className={styles.title}>Chapter not found</h1>
        <p className={styles.intro}>There is no chapter called "{id}". <Link to="/players" className={styles.link}>Back to the example card</Link>.</p>
      </div>
    );
  }
  return (
    <div>
      <h1 className={styles.title}>{chapter.title}</h1>
      <p className={styles.intro}>{chapter.blurb}</p>
      <div className={styles.soonBox}>
        <b>Not written yet.</b>
        <div className={styles.soonRows}>It will cover these rows of the card:</div>
        <ul className={styles.soonList}>{chapter.covers.map(r => <li key={r}>{r}</li>)}</ul>
        <Link to="/players/pace" className={styles.link}>See Pace for what to expect</Link>
        {" · "}
        <Link to="/players" className={styles.link}>Back to the card</Link>
      </div>
    </div>
  );
}
