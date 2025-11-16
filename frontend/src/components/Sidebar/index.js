import React from "react";
import { Link, useLocation } from "react-router-dom";
import trilemmaLogo from "../../assets/trilemma.jpeg";
import sincereLogo from "../../assets/sincereFC.jpeg";
import ThemeToggle from "../ThemeToggle";
import styles from "./Sidebar.module.css";

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className={styles.sidebar}>
      {/* --- Top Navigation --- */}
      <div>
        <h2 className={styles.title}>
          Navigation
        </h2>

        <nav className={styles.nav}>
          <Link 
            to="/" 
            className={location.pathname === "/" ? styles.linkActive : styles.link}
          >
            Home
          </Link>

          <Link
            to="#"
            className={styles.linkDisabled}
          >
            Players (Coming Soon)
          </Link>

          <Link 
            to="/tournaments" 
            className={location.pathname === "/tournaments" ? styles.linkActive : styles.link}
          >
            Tournaments
          </Link>
        </nav>
      </div>

      {/* --- Theme Toggle --- */}
      <div className={styles.themeToggleSection}>
        <ThemeToggle />
      </div>

      {/* --- Bottom Logos Section --- */}
      <div className={styles.bottomSection}>
        <div className={styles.poweredBy}>
          Powered by
        </div>

        <div className={styles.logoContainer}>
          {/* Trilemma Foundation */}
          <a
            href="https://www.trilemma.foundation/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src={trilemmaLogo}
              alt="Trilemma Foundation"
              className={styles.logo}
            />
          </a>

          {/* Sincere FC */}
          <a
            href="https://www.youtube.com/@SincereFC"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src={sincereLogo}
              alt="Sincere FC"
              className={styles.logoSmall}
            />
          </a>
        </div>
      </div>
    </div>
  );
}
