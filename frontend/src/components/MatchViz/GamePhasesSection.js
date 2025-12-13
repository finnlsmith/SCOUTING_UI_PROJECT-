import React from "react";
import useGamePhases from "./useGamePhases";
import GamePhaseCard from "./GamePhaseCard";
import styles from "./MatchViz.module.css";

export default function GamePhasesSection({ selectedMatch }) {
  const {
    gamePhases,
    gamePhaseLoading,
    gamePhaseError,
    gamePhaseTeams,
    gamePhaseMetrics,
  } = useGamePhases(selectedMatch);

  return (
    <div className={styles.gamePhases}>
      <h2 className={styles.gamePhasesTitle}>Game Phases</h2>
      {gamePhaseLoading && <div className={styles.gamePhasesLoading}>Loading phases...</div>}
      {gamePhaseError && <div className={styles.gamePhasesError}>{gamePhaseError}</div>}
      {!gamePhaseLoading && !gamePhaseError && gamePhases.length === 0 && (
        <div className={styles.gamePhasesEmpty}>No phases detected for match.</div>
      )}
      {!gamePhaseLoading && !gamePhaseError && gamePhases.length > 0 && (
        <div className={styles.gamePhasesList}>
          {gamePhases.map((phase, idx) => {
            const metrics = gamePhaseMetrics.find((m) => m.phase_idx === phase.phase_idx);
            return (
              <GamePhaseCard
                key={idx}
                phase={phase}
                metrics={metrics}
                homeTeam={gamePhaseTeams.home}
                awayTeam={gamePhaseTeams.away}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

