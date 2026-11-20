import React from "react";
import styles from "./MatchViz.module.css";

const isKeyEvent = moment =>
  (moment.event_type === "Shot" && moment.outcome === "Goal") ||
  moment.event_type === "Own Goal For" ||
  moment.event_type === "Own Goal Against" ||
  moment.event_type === "Red Card";

const minuteOf = moment => (moment.when ? Number(moment.when.split(":")[0]) : 0);

/** Goals, own goals and red cards in match order. */
export function getKeyEvents(importantMoments) {
  return importantMoments.filter(isKeyEvent).sort((a, b) => minuteOf(a) - minuteOf(b));
}

/** "Key events" list shown under the score: home events on the left, away on the right. */
export default function KeyEventsTimeline({ keyEvents, homeTeam, awayTeam }) {
  return (
    <div className={styles.keyEventsPanel}>
      <h2 className={styles.keyEventsTitle}>Key events</h2>
      <div className={styles.matchTimeline}>
        {keyEvents.length === 0 && (
          <div className={styles.keyEventsEmpty}>No goals or red cards in this match.</div>
        )}
        <div className={styles.timelineList}>
          {keyEvents.map((moment, idx) => {
            const isOwnGoal = moment.event_type === "Own Goal For" || moment.event_type === "Own Goal Against";
            const isRedCard = moment.event_type === "Red Card";

            // Own goals count for the other team
            let displayTeam = moment.team;
            if (moment.event_type === "Own Goal Against") {
              displayTeam = moment.team === homeTeam ? awayTeam : homeTeam;
            }
            const isHomeTeam = displayTeam === homeTeam;

            const icon = isRedCard ? "🟥" : "⚽";
            const color = isRedCard ? "#D32F2F" : isOwnGoal ? "#FF9800" : "#4CAF50";

            const playerName = moment.who || "";
            const lastName = playerName.includes(" ") ? playerName.split(" ").pop() : playerName;

            const iconEl = (
              <div
                className={styles.timelineIcon}
                style={{ backgroundColor: color, borderRadius: isRedCard ? "3px" : "50%" }}
              >
                {icon}
              </div>
            );

            return (
              <div key={idx} className={styles.timelineRow}>
                <div className={styles.timelineHomeCell}>
                  {isHomeTeam && (
                    <div className={styles.timelineEventContent}>
                      <span className={styles.timelinePlayerName}>{lastName}</span>
                      {iconEl}
                    </div>
                  )}
                </div>
                <div className={styles.timelineMinuteCell}>{minuteOf(moment)}'</div>
                <div className={styles.timelineAwayCell}>
                  {!isHomeTeam && (
                    <div className={styles.timelineEventContent}>
                      {iconEl}
                      <span className={styles.timelinePlayerName}>{lastName}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
