import React from "react";
import styles from "./ErrorBanner.module.css";

// Error banner component
export default function ErrorBanner({ error, onClose }) {
    if (!error) return null;
    return (
      <div className={styles.errorBanner}>
        <span>{error}</span>
        <button
          aria-label="Dismiss error"
          className={styles.closeButton}
          onClick={onClose}
        >
          ×
        </button>
      </div>
    );
  }