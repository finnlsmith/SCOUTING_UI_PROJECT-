import React, { useState, useEffect } from "react";
import CollapsibleSection from "../CollapsibleSection";
import { fetchPossessionScene } from "./possessionScene";
import styles from "./MatchViz.module.css";

/** Table of the match's key moments plus a viewer for the selected possession. */
export default function KeyMomentsSection({ matchFile, moments, loading, error }) {
  const [showScenes, setShowScenes] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [image, setImage] = useState(null);
  const [sceneLoading, setSceneLoading] = useState(false);
  const [sceneError, setSceneError] = useState(null);

  // Each new match starts with Show Scenes on
  useEffect(() => {
    setShowScenes(true);
  }, [matchFile]);

  // With scenes on, the first moment is selected by default
  useEffect(() => {
    setSelectedIdx(showScenes && moments.length > 0 ? 0 : null);
  }, [moments, matchFile, showScenes]);

  useEffect(() => {
    if (!showScenes || selectedIdx === null || moments.length === 0 || !matchFile) {
      setImage(null);
      setSceneError(null);
      setSceneLoading(false);
      return;
    }
    const moment = moments[selectedIdx];
    if (!moment) return;

    let cancelled = false;
    setImage(null);
    setSceneLoading(true);
    setSceneError(null);
    fetchPossessionScene(matchFile, moment.possession).then(result => {
      if (cancelled) return;
      if (result.image) setImage(result.image);
      else setSceneError(result.error);
      setSceneLoading(false);
    });
    return () => { cancelled = true; };
  }, [selectedIdx, matchFile, showScenes, moments]);

  const hasMoments = Array.isArray(moments) && moments.length > 0;

  return (
    <CollapsibleSection
      title="Key Moments"
      subtitle="Pick a moment in the table to see that possession."
      headerExtra={(
        <label className={styles.showScenesLabel}>
          <input
            type="checkbox"
            checked={showScenes}
            onChange={() => setShowScenes(s => !s)}
            className={styles.showScenesCheckbox}
          />
          Show Scenes
        </label>
      )}
    >
      <div className={styles.momentsContainer}>
        <div className={styles.momentsTable}>
          {loading && <div className={styles.loadingText}>Loading moments...</div>}
          {error && <div className={styles.errorText}>{error}</div>}
          {!loading && !error && Array.isArray(moments) && moments.length === 0 && (
            <div className={styles.emptyText}>No important moments found for match.</div>
          )}
          {!loading && !error && hasMoments && (
            <table className={styles.momentsTableElement}>
              <thead>
                <tr className={styles.tableHeader}>
                  {["#", "When", "Team", "Who", "Type", "xG", "Outcome", "Poss."].map(h => (
                    <th key={h} className={styles.tableHeaderCell}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {moments.map((m, idx) => (
                  <tr
                    key={idx}
                    onClick={() => { setSelectedIdx(idx); setShowScenes(true); }}
                    className={selectedIdx === idx && showScenes ? styles.tableRowSelected : styles.tableRow}
                  >
                    <td className={styles.tableCell}>{idx + 1}</td>
                    <td className={styles.tableCell}>{m.when}</td>
                    <td className={styles.tableCell}>{m.team}</td>
                    <td className={styles.tableCell}>{m.who}</td>
                    <td className={styles.tableCell}>{m.event_type}</td>
                    <td className={styles.tableCell}>{m.xg !== undefined && m.xg !== null ? m.xg : ""}</td>
                    <td className={styles.tableCell}>{m.outcome}</td>
                    <td className={styles.tableCell}>{m.possession}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {showScenes && hasMoments && selectedIdx !== null && (
          <div className={styles.sceneViewer}>
            <div className={styles.sceneNav}>
              <button
                onClick={() => setSelectedIdx(i => (i > 0 ? i - 1 : 0))}
                disabled={selectedIdx <= 0}
                className={styles.sceneNavButton}
              >{"←"}</button>
              <span className={styles.sceneNavLabel}>
                Moment {selectedIdx + 1} of {moments.length} (Possession {moments[selectedIdx]?.possession})
              </span>
              <button
                onClick={() => setSelectedIdx(i => (i < moments.length - 1 ? i + 1 : i))}
                disabled={selectedIdx >= moments.length - 1}
                className={styles.sceneNavButton}
              >{"→"}</button>
            </div>
            <div className={styles.sceneStatus}>
              {sceneLoading && "Loading scene..."}
              {sceneError && sceneError}
            </div>
            {image && (
              <img
                src={`data:image/png;base64,${image}`}
                alt="Possession Scene"
                className={styles.sceneImage}
              />
            )}
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}
