import React from "react";
import Sidebar from "../Sidebar";
import { Link } from "react-router-dom";
import ThemeToggle from "../ThemeToggle";   // <-- Add this import
import styles from "./Layout.module.css";

export default function Layout({ children }) {
  return (
    <div className={styles.container}>
      
      {/* Theme toggle fixed top-right */}
      <div className={styles.themeToggleWrapper}>
        <ThemeToggle />
      </div>

      <Sidebar />
      
      <div className={styles.content}>
        {children}

        {/* Persistent footer links */}
        <footer className={styles.footer}>
          <Link to="/about" className={styles.footerLink}>
            About
          </Link>
          <Link to="/contact" className={styles.footerLink}>
            Contact Us
          </Link>
        </footer>
      </div>
    </div>
  );
}
