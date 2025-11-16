import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import styles from "./ThemeToggle.module.css";

export default function ThemeToggle() {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      className={styles.themeToggle}
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <span className={styles.icon}>☀️</span>
      ) : (
        <span className={styles.icon}>🌙</span>
      )}
      <span className={styles.text}>
        {isDark ? 'Light' : 'Dark'}
      </span>
    </button>
  );
}

