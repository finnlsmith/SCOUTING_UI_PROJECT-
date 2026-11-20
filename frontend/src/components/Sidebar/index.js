import React from "react";
import { Link, useLocation } from "react-router-dom";
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

          {/* NEW: Tutorial */}
          <Link
            to="/tutorial"
            className={location.pathname === "/tutorial" ? styles.linkActive : styles.link}
          >
            Tutorial
          </Link>

          <Link
            to="/players"
            className={location.pathname.startsWith("/players") ? styles.linkActive : styles.link}
          >
            Players
          </Link>

          <Link 
            to="/tournaments" 
            className={location.pathname === "/tournaments" ? styles.linkActive : styles.link}
          >
            Tournaments
          </Link>
        </nav>
      </div>
    </div>
  );
}
