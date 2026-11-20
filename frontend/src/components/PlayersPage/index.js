import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { CHAPTERS, chapterPath } from "./chapters";
import styles from "./PlayersPage.module.css";

/** The Players section frame: a contents list down the side, and the current page beside it. */
export default function PlayersLayout() {
  return (
    <div className={styles.shell}>
      <nav className={styles.toc} aria-label="Player card chapters">
        <div className={styles.tocTitle}>Player card</div>
        <NavLink to="/players/about" className={({ isActive }) => (isActive ? styles.tocLinkOn : styles.tocLink)}>
          About the card
        </NavLink>
        <NavLink to="/players" end className={({ isActive }) => (isActive ? styles.tocLinkOn : styles.tocLink)}>
          Example card
        </NavLink>

        <div className={styles.tocHead}>Chapters</div>
        <ol className={styles.tocList}>
          {CHAPTERS.map(c => (
            <li key={c.id}>
              <NavLink to={chapterPath(c.id)} className={({ isActive }) => (isActive ? styles.tocLinkOn : styles.tocLink)}>
                <span>{c.title}</span>
                {c.status !== "ready" && <span className={styles.soon}>{c.status}</span>}
              </NavLink>
            </li>
          ))}
        </ol>
      </nav>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
