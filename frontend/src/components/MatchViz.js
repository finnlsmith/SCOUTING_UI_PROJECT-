import React, { useState, useEffect } from "react";
import useMatchData from "./useMatchData";
import useUpload from "./useUpload";
import useVisualization from "./useVisualization";

import ErrorBanner from "./ErrorBanner";
import FileUpload from "./FileUpload";
import MatchSelector from "./MatchSelector";
import Scoreboard from "./Scoreboard";
import ShotMapButtons from "./ShotMapButtons";
import ShotMapPlot from "./ShotMapPlot";
import PassingNetworkButtons from "./PassingNetworkButtons";

export default function MatchViz() {
  const { matches, loading: matchesLoading, error: matchesError, setError: setMatchesError } = useMatchData();
  const { setFile, upload, uploading, success, error: uploadError, setError: setUploadError } = useUpload(); //file, 
  const {
    figData,
    setFigData,
    loading: plotLoading,
    loadMatchViz,
    loadTeamShotmap,
    loadBothShotmaps,
    loadPassingNetwork,
    error: vizError,
    setError: setVizError,
    importantMoments,
    importantMomentsLoading,
    importantMomentsError,
    fetchImportantMoments,
  } = useVisualization();

  const [selectedMatch, setSelectedMatch] = useState("");
  const [flipSides, setFlipSides] = useState(false);
  const [stats, setStats] = useState({});
  const [globalError, setGlobalError] = useState("");

  // New state for scene image, selected moment
  const [selectedMomentIdx, setSelectedMomentIdx] = useState(null);
  const [sceneImageBase64, setSceneImageBase64] = useState(null);
  const [sceneLoading, setSceneLoading] = useState(false);
  const [sceneError, setSceneError] = useState(null);
  const [showImportantScenes, setShowImportantScenes] = useState(false);

  useEffect(() => {
    setGlobalError(matchesError || uploadError || vizError || "");
  }, [matchesError, uploadError, vizError]);

  function handleClearError() {
    setGlobalError("");
    setMatchesError("");
    setUploadError("");
    setVizError && setVizError("");
  }

  // ====== FALLBACK TEAM NAME LOGIC ======
  // Get the selected match label (e.g. "2021-06-28 - France vs Switzerland – Events")
  const selectedLabel = matches.find(m => m.file === selectedMatch)?.label || "";

  // Extract home and away names using regex
  const m = /-\s(.*?)\svs\s(.*?)\s–/.exec(selectedLabel);
  const fallbackHome = m?.[1];
  const fallbackAway = m?.[2];

  // Prefer the actual team names from stats if available, otherwise use fallback
  const homeName = stats?.home_team || fallbackHome;
  const awayName = stats?.away_team || fallbackAway;

  // Only enable buttons if both names exist
  const canShoot = Boolean(selectedMatch && homeName && awayName);

  // Fetch important moments when a match is selected
  useEffect(() => {
    if (selectedMatch) fetchImportantMoments(selectedMatch);
  }, [selectedMatch, fetchImportantMoments]);

  // When a new moment row is selected, fetch and display the scene plot
  useEffect(() => {
    // Only fetch if box ticked and row selected
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
    fetch(`https://columbia-msds-f25-soccer.onrender.com/api/match/${selectedMatch}/possession_scene?possession=${m.possession}`)
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

  // Select first important moment whenever moments or match change (if box is checked)
  useEffect(() => {
    if (showImportantScenes && importantMoments.length > 0) {
      setSelectedMomentIdx(0);
    } else {
      setSelectedMomentIdx(null);
    }
  }, [importantMoments, selectedMatch, showImportantScenes]);

  // Handlers
  const handleMomentClick = idx => {
    setSelectedMomentIdx(idx);
    setShowImportantScenes(true);
  };
  const handlePrev = () => setSelectedMomentIdx(idx => idx > 0 ? idx - 1 : 0);
  const handleNext = () => setSelectedMomentIdx(idx => idx < importantMoments.length - 1 ? idx + 1 : idx);
  const handleShowImportantScenesToggle = () => setShowImportantScenes(s => !s);


  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <ErrorBanner error={globalError} onClose={handleClearError} />

      <h2>Select or Upload a Match</h2>

      <FileUpload
        onFileChange={(e) => setFile(e.target.files[0])}
        onUpload={async () => {
          try {
            const data = await upload();
            if (data) setStats(data);
          } catch (e) {
            setVizError?.(e?.message || "Upload failed");
          }
        }}
        uploading={uploading}
        uploadSuccess={success}
      />

      <MatchSelector
        matches={matches}
        selectedMatch={selectedMatch}
        onChange={async (v) => {
          setSelectedMatch(v);
          try {
            // Only update stats for scoreboard, NOT figData/chart!
            await loadMatchViz(v, setStats);
            setFigData(null); // Clear chart when new match is selected
          } catch (e) {
            setVizError?.(e?.message || "Failed to load match");
          }
        }}
        flipSides={flipSides}
        onFlipChange={setFlipSides}
        onReset={() => {
          setSelectedMatch("");
          setStats({});
          setFigData(null); // Clear chart when reset
        }}
        matchesLoading={matchesLoading}
      />

      <Scoreboard
        stage={stats.competition_stage}
        home={stats.home_team}
        away={stats.away_team}
        score={
          Number.isFinite(stats.home_score) && Number.isFinite(stats.away_score)
            ? `${stats.home_score} - ${stats.away_score}`
            : "-"
        }
        shots={
          Number.isFinite(stats.home_shots) && Number.isFinite(stats.away_shots)
            ? `${stats.home_shots} - ${stats.away_shots}`
            : "-"
        }
        shotsOnTarget={
          Number.isFinite(stats.home_shots_on_target) && Number.isFinite(stats.away_shots_on_target)
            ? `${stats.home_shots_on_target} - ${stats.away_shots_on_target}`
            : "-"
        }
        xg={
          Number.isFinite(stats.home_xg_sum) && Number.isFinite(stats.away_xg_sum)
            ? `${Number(stats.home_xg_sum || 0).toFixed(2)} - ${Number(stats.away_xg_sum || 0).toFixed(2)}`
            : "-"
        }
      />

      {/* --- Important moments table with click/select/highlight --- */}
      <div style={{ margin: "30px auto", maxWidth: 540 }}>
        <h3>Key Moments</h3>
        <label style={{ cursor: 'pointer', fontWeight: 400 }}>
          <input type="checkbox" checked={showImportantScenes} onChange={handleShowImportantScenesToggle} style={{ marginRight: 6 }} />
          Show Important Scenes
        </label>
        {importantMomentsLoading && <div>Loading moments...</div>}
        {importantMomentsError && <div style={{ color: 'red' }}>{importantMomentsError}</div>}
        {!importantMomentsLoading && !importantMomentsError && Array.isArray(importantMoments) && importantMoments.length === 0 && (
          <div>No important moments found for match.</div>
        )}
        {!importantMomentsLoading && !importantMomentsError && Array.isArray(importantMoments) && importantMoments.length > 0 && (
          <table style={{ margin: "0 auto", fontSize: "1rem", borderCollapse: "collapse", minWidth: 380 }}>
            <thead>
              <tr style={{ background: '#efefef' }}>
                <th style={{ border: '1px solid #bbb', padding: '3px 7px' }}>#</th>
                <th style={{ border: '1px solid #bbb', padding: '3px 7px' }}>When</th>
                <th style={{ border: '1px solid #bbb', padding: '3px 7px' }}>Who</th>
                <th style={{ border: '1px solid #bbb', padding: '3px 7px' }}>Type</th>
                <th style={{ border: '1px solid #bbb', padding: '3px 7px' }}>xG</th>
                <th style={{ border: '1px solid #bbb', padding: '3px 7px' }}>Outcome</th>
                <th style={{ border: '1px solid #bbb', padding: '3px 7px' }}>Poss.</th>
              </tr>
            </thead>
            <tbody>
              {importantMoments.map((m, idx) => (
                <tr
                  key={idx}
                  onClick={() => handleMomentClick(idx)}
                  style={{
                    cursor: 'pointer',
                    background: selectedMomentIdx === idx && showImportantScenes ? '#def' : '',
                    fontWeight: selectedMomentIdx === idx && showImportantScenes ? 600 : 400,
                    transition: 'background 0.14s',
                  }}
                >
                  <td style={{ border: '1px solid #ccc', padding: '2px 7px' }}>{idx + 1}</td>
                  <td style={{ border: '1px solid #ccc', padding: '2px 7px' }}>{m.when}</td>
                  <td style={{ border: '1px solid #ccc', padding: '2px 7px' }}>{m.who}</td>
                  <td style={{ border: '1px solid #ccc', padding: '2px 7px' }}>{m.event_type}</td>
                  <td style={{ border: '1px solid #ccc', padding: '2px 7px' }}>{m.xg !== undefined && m.xg !== null ? m.xg : ''}</td>
                  <td style={{ border: '1px solid #ccc', padding: '2px 7px' }}>{m.outcome}</td>
                  <td style={{ border: '1px solid #ccc', padding: '2px 7px' }}>{m.possession}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {/* Scene viewer with navigation */}
        {showImportantScenes && importantMoments.length > 0 && selectedMomentIdx !== null && (
          <div style={{ margin: '36px 0 0' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <button onClick={handlePrev} disabled={selectedMomentIdx <= 0} style={{ fontSize: 20, marginRight: 9, padding: '8px 13px' }}>{'←'}</button>
              <span style={{ fontSize: 16, fontWeight: 500 }}>
                Moment {selectedMomentIdx + 1} of {importantMoments.length} (Possession {importantMoments[selectedMomentIdx]?.possession})
              </span>
              <button onClick={handleNext} disabled={selectedMomentIdx >= importantMoments.length - 1} style={{ fontSize: 20, marginLeft: 9, padding: '8px 13px' }}>{'→'}</button>
            </div>
            <div style={{ minHeight: 42, margin: '16px auto', color: '#ad031c', fontWeight: 500 }}>
              {sceneLoading && 'Loading scene...'}
              {sceneError && sceneError}
            </div>
            {sceneImageBase64 && (
              <img
                src={`data:image/png;base64,${sceneImageBase64}`}
                alt="Possession Scene"
                style={{ maxWidth: '98%', margin: '10px auto', border: '2px solid #888', borderRadius: 10, boxShadow: '0 6px 24px #0001' }}
              />
            )}
          </div>
        )}
      </div>
      {/* --- End important moments scene viewer --- */}

      <ShotMapButtons
        home={homeName}
        away={awayName}
        onHome={() => canShoot && loadTeamShotmap(selectedMatch, homeName)}
        onAway={() => canShoot && loadTeamShotmap(selectedMatch, awayName)}
        onBoth={() => canShoot && loadBothShotmaps(selectedMatch, homeName, awayName)}
      />

      <PassingNetworkButtons
        home={homeName}
        away={awayName}
        onHomePN={() => canShoot && loadPassingNetwork(selectedMatch, homeName, 1, false)}
        onAwayPN={() => canShoot && loadPassingNetwork(selectedMatch, awayName, 1, true)}
        disabled={!canShoot}
      />

      <ShotMapPlot displayFig={figData} flipSides={flipSides} plotLoading={plotLoading} />
    </div>
  );
}
