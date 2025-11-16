import React from "react";
import { useNavigate } from "react-router-dom";
import euro2020 from "../../assets/euro2020.jpeg";
import styles from "./TournamentsPage.module.css";
import sharedStyles from "../../styles/shared.module.css";

export default function TournamentsPage() {
  const navigate = useNavigate();
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>
        Select a Tournament
      </h1>

      <div className={styles.buttonContainer}>
        <button
          onClick={() => navigate("/euro-2020")}
          className={sharedStyles.buttonPrimary}
        >
          Euro 2020
        </button>
      </div>

      <div className={styles.comingSoon}>
        (More tournaments coming soon)
      </div>

      {/* Euro 2020 image fixed at bottom center */}
      <img
        src={euro2020}
        alt="Euro 2020"
        className={styles.tournamentImage}
      />
    </div>
  );
}
