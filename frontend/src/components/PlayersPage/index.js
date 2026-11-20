import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { CHAPTERS, GROUPS, chapterPath } from "./chapters";
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

        {GROUPS.map(g => {
          const items = CHAPTERS.filter(c => c.group === g.id);
          const same = items.length === 1 && items[0].title === g.title;
          return (
            <div key={g.id} className={g.muted ? styles.tocMuted : undefined}>
              {!same && <div className={styles.tocHead}>{g.title}</div>}
              <ol className={styles.tocList}>
                {items.map(c => (
                  <li key={c.id}>
                    <NavLink to={chapterPath(c.id)} className={({ isActive }) => (isActive ? styles.tocLinkOn : styles.tocLink)}>
                      <span>{c.title}</span>
                      {g.muted && <span className={styles.soon}>forwards only</span>}
                      {!g.muted && c.status !== "ready" && <span className={styles.soon}>{c.status}</span>}
                    </NavLink>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </nav>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
