import React from "react";
import styles from "./MatchViz.module.css";

export default function PhaseMetricsTable({ metrics, homeTeam, awayTeam }) {
  return (
    <table className={styles.phaseMetricsTable}>
      <thead>
        <tr>
          <th className={styles.phaseMetricsHeaderCell}>Statistic</th>
          <th className={styles.phaseMetricsHeaderCell}>{homeTeam}</th>
          <th className={styles.phaseMetricsHeaderCell}>{awayTeam}</th>
        </tr>
      </thead>
      <tbody>
        <tr className={styles.phaseMetricsRow}>
          <td className={styles.phaseMetricsLabelCell}>Goals</td>
          <td className={styles.phaseMetricsValueCell}>{metrics.goals?.[homeTeam] ?? 0}</td>
          <td className={styles.phaseMetricsValueCell}>{metrics.goals?.[awayTeam] ?? 0}</td>
        </tr>
        <tr className={styles.phaseMetricsRow}>
          <td className={styles.phaseMetricsLabelCell}>Shots (total)</td>
          <td className={styles.phaseMetricsValueCell}>{metrics.shots_summary?.[homeTeam]?.total ?? 0}</td>
          <td className={styles.phaseMetricsValueCell}>{metrics.shots_summary?.[awayTeam]?.total ?? 0}</td>
        </tr>
        <tr className={styles.phaseMetricsRow}>
          <td className={styles.phaseMetricsLabelCell}>Shots on Target</td>
          <td className={styles.phaseMetricsValueCell}>{metrics.shots_summary?.[homeTeam]?.on_target ?? 0}</td>
          <td className={styles.phaseMetricsValueCell}>{metrics.shots_summary?.[awayTeam]?.on_target ?? 0}</td>
        </tr>
        <tr className={styles.phaseMetricsRow}>
          <td className={styles.phaseMetricsLabelCell}>Possession %</td>
          <td className={styles.phaseMetricsValueCell}>{metrics.possession_pct_by_passes?.[homeTeam] ?? 0}%</td>
          <td className={styles.phaseMetricsValueCell}>{metrics.possession_pct_by_passes?.[awayTeam] ?? 0}%</td>
        </tr>
        <tr className={styles.phaseMetricsRow}>
          <td className={styles.phaseMetricsLabelCell}>Box Entries</td>
          <td className={styles.phaseMetricsValueCell}>{metrics.box_entries?.[homeTeam] ?? 0}</td>
          <td className={styles.phaseMetricsValueCell}>{metrics.box_entries?.[awayTeam] ?? 0}</td>
        </tr>
        <tr className={styles.phaseMetricsRow}>
          <td className={styles.phaseMetricsLabelCell}>Final Third Entries</td>
          <td className={styles.phaseMetricsValueCell}>{metrics.final_third_entries?.[homeTeam] ?? 0}</td>
          <td className={styles.phaseMetricsValueCell}>{metrics.final_third_entries?.[awayTeam] ?? 0}</td>
        </tr>
        <tr className={styles.phaseMetricsRow}>
          <td className={styles.phaseMetricsLabelCell}>Fouls</td>
          <td className={styles.phaseMetricsValueCell}>{metrics.fouls?.[homeTeam] ?? 0}</td>
          <td className={styles.phaseMetricsValueCell}>{metrics.fouls?.[awayTeam] ?? 0}</td>
        </tr>
        <tr className={styles.phaseMetricsRow}>
          <td className={styles.phaseMetricsLabelCell}>Cards (Yellow / Red)</td>
          <td className={styles.phaseMetricsValueCell}>
            {metrics.cards?.[homeTeam]?.yellow ?? 0} / {metrics.cards?.[homeTeam]?.red ?? 0}
          </td>
          <td className={styles.phaseMetricsValueCell}>
            {metrics.cards?.[awayTeam]?.yellow ?? 0} / {metrics.cards?.[awayTeam]?.red ?? 0}
          </td>
        </tr>
        <tr className={styles.phaseMetricsRow}>
          <td className={styles.phaseMetricsLabelCell}>Chances (OK / Good)</td>
          <td className={styles.phaseMetricsValueCell}>
            {metrics.chances?.[homeTeam]?.ok ?? 0} / {metrics.chances?.[homeTeam]?.good ?? 0}
          </td>
          <td className={styles.phaseMetricsValueCell}>
            {metrics.chances?.[awayTeam]?.ok ?? 0} / {metrics.chances?.[awayTeam]?.good ?? 0}
          </td>
        </tr>
        <tr className={styles.phaseMetricsRow}>
          <td className={styles.phaseMetricsLabelCell}>Penalties</td>
          <td className={styles.phaseMetricsValueCell}>{metrics.penalties?.[homeTeam] ?? 0}</td>
          <td className={styles.phaseMetricsValueCell}>{metrics.penalties?.[awayTeam] ?? 0}</td>
        </tr>
      </tbody>
    </table>
  );
}

