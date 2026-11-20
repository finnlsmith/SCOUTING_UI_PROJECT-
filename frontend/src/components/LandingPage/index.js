import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./LandingPage.module.css";
import sharedStyles from "../../styles/shared.module.css";

export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>
        Sincere FC Scouting UI
      </h1>

      <div className={styles.buttonContainer}>
        <button
          className={sharedStyles.buttonPrimary}
          onClick={() => navigate("/tournaments")}
        >
          Tournaments
        </button>

        <button
          className={sharedStyles.buttonPrimary}
          onClick={() => navigate("/players")}
        >
          Players
        </button>
      </div>
    </div>
  );
}
