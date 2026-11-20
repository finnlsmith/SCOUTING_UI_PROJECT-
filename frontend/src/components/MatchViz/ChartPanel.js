import React, { Suspense, lazy } from "react";
import { PlotSkeleton } from "../LoadingSkeleton";
import styles from "./MatchViz.module.css";

const ShotMapPlot = lazy(() => import("../ShotMapPlot"));

/**
 * One chart column: title, the plot (once loaded), a row of loader buttons and a reset button.
 * `buttons` is a list of { label, onClick, className }.
 */
export default function ChartPanel({
  title, titleClass, plotClass, buttonRowClass,
  figData, flipSides, plotLoading, buttons, resetLabel, onReset,
}) {
  return (
    <div className={styles.chartColumn}>
      <h2 className={titleClass}>{title}</h2>
      {figData && (
        <div className={plotClass}>
          <Suspense fallback={<PlotSkeleton />}>
            <ShotMapPlot displayFig={figData} flipSides={flipSides} plotLoading={plotLoading} fit />
          </Suspense>
        </div>
      )}
      <div className={buttonRowClass}>
        {buttons.map(b => (
          <button key={b.label} onClick={b.onClick} className={b.className}>{b.label}</button>
        ))}
      </div>
      <div className={styles.resetButtonContainer}>
        <button onClick={onReset} className={styles.resetButton}>{resetLabel}</button>
      </div>
    </div>
  );
}
