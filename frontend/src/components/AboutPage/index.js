import React from "react";
import styles from "./AboutPage.module.css";

export default function AboutPage() {
  return (
    <div className={styles.container}>
      <div>
        <h2 className={styles.title}>
          About
        </h2>

        <div className={styles.content}>
          <p>
            Every match tells a story. The Sincere FC Scouting UI is an interactive
            dashboard for exploring match data: shot maps, passing networks, key
            moments and game phases.
          </p>
          <p>
            Whether you're a fan, a coach, or a curious analyst, this dashboard lets
            you experience the beautiful game from a whole new perspective.
          </p>
        </div>
      </div>
    </div>
  );
}
