import React from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/roarstats-logo.png";
import styles from "./LandingPage.module.css";
import sharedStyles from "../../styles/shared.module.css";

export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <div className={styles.container}>
      <img src={logo} alt="RoarStats Logo" className={styles.logo} />
      <h1 className={styles.title}>
        RoarStats - Nov 2025 Beta
        {/* Columbia MSDS 25 - Placeholder */}
      </h1>

      <div className={styles.buttonContainer}>
        <button
          className={sharedStyles.buttonPrimary}
          onClick={() => navigate("/tournaments")}
        >
          Tournaments
        </button>

        <button
          className={sharedStyles.buttonSecondary}
          disabled
        >
          Players (coming soon)
        </button>
      </div>
    </div>
  );
}
