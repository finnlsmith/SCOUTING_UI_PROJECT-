import React, { useState, useEffect } from "react";
import styles from "./MatchViz.module.css";

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000/api').replace(/\/+$/, '');

export default function KeyMomentsSection({ 
  selectedMatch, 
  importantMoments, 
  importantMomentsLoading, 
  importantMomentsError,
  showImportantScenes,
  onToggleScenes
}) {
  const [selectedMomentIdx, setSelectedMomentIdx] = useState(null);
  const [sceneImageBase64, setSceneImageBase64] = useState(null);
  const [sceneLoading, setSceneLoading] = useState(false);
  const [sceneError, setSceneError] = useState(null);

  useEffect(() => {
    if (!showImportantScenes || selectedMomentIdx === null || importantMoments.length === 0 || !selectedMatch) {
      setSceneImageBase64(null);
      setSceneError(null);
      setSceneLoading(false);
      return;
    }
    const m = importantMoments[selectedMomentIdx];
    if (!m) return;
    setSceneImageBase64(null);
    setSceneLoading(true);
    setSceneError(null);
    fetch(`${BACKEND_URL}/match/${selectedMatch}/possession_scene?possession=${m.possession}`)
      .then(res => res.json())
      .then(res => {
        if (res.image_base64) {
          setSceneImageBase64(res.image_base64);
        } else if (res.error) {
          setSceneError(res.error);
        } else {
          setSceneError("No image returned");
        }
      })
      .catch(() => setSceneError("Failed to fetch possession scene"))
      .finally(() => setSceneLoading(false));
  }, [selectedMomentIdx, selectedMatch, showImportantScenes, importantMoments]);

  useEffect(() => {
    if (showImportantScenes && importantMoments.length > 0) {
      setSelectedMomentIdx(0);
    } else {
      setSelectedMomentIdx(null);
    }
  }, [importantMoments, selectedMatch, showImportantScenes]);

  const handleMomentClick = idx => {
    setSelectedMomentIdx(idx);
    onToggleScenes(true);
  };

  const handlePrev = () => setSelectedMomentIdx(idx => idx > 0 ? idx - 1 : 0);
  const handleNext = () => setSelectedMomentIdx(idx => idx < importantMoments.length - 1 ? idx + 1 : idx);

  return (
    <div className={styles.keyMoments}>
      <h2 className={styles.keyMomentsTitle}>
        Key Moments{" "}
        <span className={styles.showScenesLabel}>
          <input
            type="checkbox"
            checked={showImportantScenes}
            onChange={(e) => onToggleScenes(e.target.checked)}
            className={styles.showScenesCheckbox}
          />
          Show Scenes
        </span>
      </h2>
      <div className={styles.momentsContainer}>
        {/* Moments Table */}
        <div className={styles.momentsTable}>
          {importantMomentsLoading && <div className={styles.loadingText}>Loading moments...</div>}
          {importantMomentsError && <div className={styles.errorText}>{importantMomentsError}</div>}
          {!importantMomentsLoading &&
            !importantMomentsError &&
            Array.isArray(importantMoments) &&
            importantMoments.length === 0 && (
              <div className={styles.emptyText}>No important moments found for match.</div>
            )}
          {!importantMomentsLoading &&
            !importantMomentsError &&
            Array.isArray(importantMoments) &&
            importantMoments.length > 0 && (
              <table className={styles.momentsTableElement}>
                <thead>
                  <tr className={styles.tableHeader}>
                    <th className={styles.tableHeaderCell}>#</th>
                    <th className={styles.tableHeaderCell}>When</th>
                    <th className={styles.tableHeaderCell}>Who</th>
                    <th className={styles.tableHeaderCell}>Type</th>
                    <th className={styles.tableHeaderCell}>xG</th>
                    <th className={styles.tableHeaderCell}>Outcome</th>
                    <th className={styles.tableHeaderCell}>Poss.</th>
                  </tr>
                </thead>
                <tbody>
                  {importantMoments.map((m, idx) => (
                    <tr
                      key={idx}
                      onClick={() => handleMomentClick(idx)}
                      className={
                        selectedMomentIdx === idx && showImportantScenes
                          ? styles.tableRowSelected
                          : styles.tableRow
                      }
                    >
                      <td className={styles.tableCell}>{idx + 1}</td>
                      <td className={styles.tableCell}>{m.when}</td>
                      <td className={styles.tableCell}>{m.who}</td>
                      <td className={styles.tableCell}>{m.event_type}</td>
                      <td className={styles.tableCell}>
                        {m.xg !== undefined && m.xg !== null ? m.xg : ""}
                      </td>
                      <td className={styles.tableCell}>{m.outcome}</td>
                      <td className={styles.tableCell}>{m.possession}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
        {/* Scene Viewer */}
        {showImportantScenes && importantMoments.length > 0 && selectedMomentIdx !== null && (
          <div className={styles.sceneViewer}>
            <div className={styles.sceneNav}>
              <button
                onClick={handlePrev}
                disabled={selectedMomentIdx <= 0}
                className={styles.sceneNavButton}
              >
                {"←"}
              </button>
              <span className={styles.sceneNavLabel}>
                Moment {selectedMomentIdx + 1} of {importantMoments.length} (Possession{" "}
                {importantMoments[selectedMomentIdx]?.possession})
              </span>
              <button
                onClick={handleNext}
                disabled={selectedMomentIdx >= importantMoments.length - 1}
                className={styles.sceneNavButton}
              >
                {"→"}
              </button>
            </div>
            <div className={styles.sceneStatus}>
              {sceneLoading && "Loading scene..."}
              {sceneError && sceneError}
            </div>
            {sceneImageBase64 && (
              <img
                src={`data:image/png;base64,${sceneImageBase64}`}
                alt="Possession Scene"
                className={styles.sceneImage}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

