import React from "react";
import uciLogo from "../../assets/uci.jpeg";
import columbiaLogo from "../../assets/columbia.png";
import nyuLogo from "../../assets/nyu.jpeg";
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
            Every match tells a story. Our team of Columbia University Data Science
            students developed this dashboard as part of our capstone project.
          </p>
          <p>
            This project, in partnership with the Trilemma Foundation, reflects our
            shared mission to make data more interactive and actionable in the world
            of sports.
          </p>
          <p>
            Whether you're a fan, a coach, or a curious analyst, this dashboard lets
            you experience the beautiful game from a whole new perspective.
          </p>
        </div>
      </div>

      {/* --- Logos Section --- */}
      <div className={styles.logosSection}>
        <img
          src={uciLogo}
          alt="UCI"
          className={styles.logo}
        />
        <img
          src={columbiaLogo}
          alt="Columbia University"
          className={styles.logoLarge}
        />
        <img
          src={nyuLogo}
          alt="NYU"
          className={styles.logo}
        />
      </div>
    </div>
  );
}