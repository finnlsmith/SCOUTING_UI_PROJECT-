import React, { useState, useEffect } from "react";
import useMatchData from "./useMatchData";
import useUpload from "./useUpload";
import useVisualization from "./useVisualization";
import ErrorBanner from "./ErrorBanner";
// import FileUpload from "./FileUpload";
import MatchSelector from "./MatchSelector";
import Scoreboard from "./Scoreboard";
// import ShotMapButtons from "./ShotMapButtons";
import ShotMapPlot from "./ShotMapPlot";
// import PassingNetworkButtons from "./PassingNetworkButtons";

export default function MatchViz() {
  const { matches, loading: matchesLoading, error: matchesError, setError: setMatchesError } = useMatchData();
  const { error: uploadError, setError: setUploadError } = useUpload();
  const {
    loading: plotLoading,
    loadMatchViz,
    loadTeamShotmap,
    loadBothShotmaps,
    loadPassingNetwork,
    error: vizError, setError: setVizError,
    importantMoments,
    importantMomentsLoading,
    importantMomentsError,
    fetchImportantMoments,
  } = useVisualization();

  const [selectedMatch, setSelectedMatch] = useState("");
  const [flipSides, setFlipSides] = useState(false);
  const [stats, setStats] = useState({});
  const [globalError, setGlobalError] = useState("");
  const [shotMapFigData, setShotMapFigData] = useState(null);
  const [passNetFigData, setPassNetFigData] = useState(null);
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
  const selectedLabel = matches.find(m => m.file === selectedMatch)?.label || "";
  const m = /-\s(.*?)\svs\s(.*?)\s–/.exec(selectedLabel);
  const fallbackHome = m?.[1];
  const fallbackAway = m?.[2];
  const homeName = stats?.home_team || fallbackHome;
  const awayName = stats?.away_team || fallbackAway;
  const canShoot = Boolean(selectedMatch && homeName && awayName);

  useEffect(() => {
    if (selectedMatch) fetchImportantMoments(selectedMatch);
  }, [selectedMatch, fetchImportantMoments]);

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

  useEffect(() => {
    if (showImportantScenes && importantMoments.length > 0) {
      setSelectedMomentIdx(0);
    } else {
      setSelectedMomentIdx(null);
    }
  }, [importantMoments, selectedMatch, showImportantScenes]);

  const handleMomentClick = idx => {
    setSelectedMomentIdx(idx);
    setShowImportantScenes(true);
  };
  const handlePrev = () => setSelectedMomentIdx(idx => idx > 0 ? idx - 1 : 0);
  const handleNext = () => setSelectedMomentIdx(idx => idx < importantMoments.length - 1 ? idx + 1 : idx);
  const handleShowImportantScenesToggle = () => setShowImportantScenes(s => !s);

  return (
    <div style={{ padding: '40px 0 70px', background: '#fff', minHeight: "100vh" }}>
      <ErrorBanner error={globalError} onClose={handleClearError} />
      <div style={{ maxWidth: 1310, margin: '0 auto' }}>
        {/* Tournament Title */}
        <h1 style={{ fontSize: 44, fontWeight: 800, marginBottom: 19, letterSpacing: 1 }}>Euro 2020</h1>
        {/* Match Selection */}
        <div style={{ marginBottom: 30 }}>
          <h2 style={{ fontSize: 27, fontWeight: 600, marginBottom: 11 }}>Select a Match</h2>
          <div style={{ maxWidth: 350, marginBottom: 22 }}>
            <MatchSelector
              matches={matches}
              selectedMatch={selectedMatch}
              onChange={async (v) => {
                setSelectedMatch(v);
                try {
                  await loadMatchViz(v, setStats);
                  // setFigData(null); // This line was commented out in the original file
                } catch (e) {
                  setVizError?.(e?.message || "Failed to load match");
                }
              }}
              flipSides={flipSides}
              onFlipChange={setFlipSides}
              onReset={() => {
                setSelectedMatch("");
                setStats({});
                // setFigData(null); // This line was commented out in the original file
              }}
              matchesLoading={matchesLoading}
            />
          </div>
        </div>

        {selectedMatch && (
          <>
            {/* Main 3-panel row */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 48, marginBottom: 54 }}>
              {/* Match Facts */}
              <div style={{ flex: 1, minWidth: 295 }}>
                <h2 style={{ fontSize: 30, fontWeight: 500, marginBottom: 18, textAlign: 'center' }}>Match Facts</h2>
                <div style={{ boxShadow: '0 2px 16px #0001', borderRadius: 16, background: '#f8fafc', padding: 17, minHeight: 230, maxWidth: 350, margin: '0 auto' }}>
                  <Scoreboard
                    stage={stats.competition_stage}
                    home={stats.home_team}
                    away={stats.away_team}
                    score={Number.isFinite(stats.home_score) && Number.isFinite(stats.away_score) ? `${stats.home_score} - ${stats.away_score}` : "-"}
                    shots={(stats.home_shots !== null && stats.away_shots !== null && stats.home_shots !== undefined && stats.away_shots !== undefined)
                      ? `${stats.home_shots} - ${stats.away_shots}` : "-"}
                    shotsOnTarget={(stats.home_shots_on_target !== null && stats.away_shots_on_target !== null && stats.home_shots_on_target !== undefined && stats.away_shots_on_target !== undefined)
                      ? `${stats.home_shots_on_target} - ${stats.away_shots_on_target}` : "-"}
                    xg={(stats.home_xg_sum && stats.away_xg_sum)
                        ? `${stats.home_xg_sum} - ${stats.away_xg_sum}`
                        : "-"}
                  />
                </div>
              </div>

              {/* Shot Maps, with buttons */}
              <div style={{ flex: 2, minWidth: 340, textAlign:"center" }}>
                <h2 style={{ fontSize: 30, fontWeight: 500, marginBottom: 18 }}>Shot Maps</h2>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginBottom: 14, gap: 28 }}>
                  <label style={{ fontSize:18, fontWeight: 400 }}>
                    <input
                      type="checkbox"
                      checked={flipSides}
                      onChange={(e) => setFlipSides(e.target.checked)}
                      style={{ transform: 'scale(1.4)', verticalAlign:'middle', marginRight:7 }}
                    />
                    Flip Sides
                  </label>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginBottom: 13 }}>
                  <button onClick={async () => {
                    if (!canShoot) return;
                    const data = await loadTeamShotmap(selectedMatch, homeName);
                    setShotMapFigData(data);
                  }} style={{ fontSize:17, padding:'9px 18px', borderRadius:8, border:'1.5px solid #222', fontWeight:500, background:'#fff', boxShadow:'3px 4px 0 #0002', minWidth: 148, cursor:'pointer' }}>Shot map – {homeName}</button>
                  <button onClick={async () => {
                    if (!canShoot) return;
                    const data = await loadTeamShotmap(selectedMatch, awayName);
                    setShotMapFigData(data);
                  }} style={{ fontSize:17, padding:'9px 18px', borderRadius:8, border:'1.5px solid #222', fontWeight:500, background:'#fff', boxShadow:'3px 4px 0 #0002', minWidth: 148, cursor:'pointer' }}>Shot map – {awayName}</button>
                  <button onClick={async () => {
                    if (!canShoot) return;
                    const data = await loadBothShotmaps(selectedMatch, homeName, awayName);
                    setShotMapFigData(data);
                  }} style={{ fontSize:17, padding:'9px 18px', borderRadius:8, border:'1.5px solid #222', fontWeight:500, background:'#fff', boxShadow:'3px 4px 0 #0002', minWidth: 170, cursor:'pointer' }}>Both Teams Shot Map</button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12, marginBottom: -12 }}>
                  <button 
                    onClick={() => setShotMapFigData(null)}
                    style={{ fontSize: 16, padding: '6px 20px', borderRadius: 8, border: '1.3px solid #bbb', background: '#fff', fontWeight: 500, margin: '0 4px', cursor: 'pointer' }}
                  >Reset Shot Map</button>
                </div>
                {shotMapFigData && (
                  <div style={{ margin: '24px auto 0', width: 330, display: 'flex', justifyContent: 'center' }}>
                    <ShotMapPlot displayFig={shotMapFigData} flipSides={flipSides} plotLoading={plotLoading} smaller />
                  </div>
                )}
              </div>

              {/* Passing Network (right) */}
              <div style={{ flex: 1.42, minWidth: 295 }}>
                <h2 style={{ fontSize: 30, fontWeight: 500, marginBottom: 18, textAlign: 'center' }}>Passing Network</h2>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 11, marginBottom: 15 }}>
                  <button onClick={async () => {
                    if (!canShoot) return;
                    const data = await loadPassingNetwork(selectedMatch, homeName, 1, false);
                    setPassNetFigData(data);
                  }} style={{ fontSize:17, padding:'9px 18px', borderRadius:8, border:'1.5px solid #222', fontWeight:500, background:'#fff', boxShadow:'3px 4px 0 #0002', minWidth: 155, cursor:'pointer' }}>{homeName} Network</button>
                  <button onClick={async () => {
                    if (!canShoot) return;
                    const data = await loadPassingNetwork(selectedMatch, awayName, 1, true);
                    setPassNetFigData(data);
                  }} style={{ fontSize:17, padding:'9px 18px', borderRadius:8, border:'1.5px solid #222', fontWeight:500, background:'#fff', boxShadow:'3px 4px 0 #0002', minWidth: 155, cursor:'pointer' }}>{awayName} Network</button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12, marginBottom: -12 }}>
                  <button 
                    onClick={() => setPassNetFigData(null)}
                    style={{ fontSize: 16, padding: '6px 20px', borderRadius: 8, border: '1.3px solid #bbb', background: '#fff', fontWeight: 500, margin: '0 4px', cursor: 'pointer' }}
                  >Reset Passing Network</button>
                </div>
                {passNetFigData && (
                  <div style={{ margin: '24px auto 0', maxWidth:540 }}>
                    <ShotMapPlot displayFig={passNetFigData} flipSides={flipSides} plotLoading={plotLoading} customSize={{ width: 540, height: 380 }} />
                  </div>
                )}
              </div>
            </div>
            {/* Key Moments Section */}
            <div style={{ marginTop: 11 }}>
              <h2 style={{ fontSize: 29, fontWeight: 500, marginBottom: 5, textAlign:'left' }}>Key Moments <span style={{ fontSize:18, fontWeight:400, marginLeft:18}}><input type="checkbox" checked={showImportantScenes} onChange={handleShowImportantScenesToggle} style={{ transform:'scale(1.32)', marginRight:3, verticalAlign:'middle'}} />Show Scenes</span></h2>
              <div style={{ display:'flex', flexDirection:'row', alignItems:'flex-start', gap:19, flexWrap:'nowrap' }}>
                {/* Moments Table */}
                <div style={{ width: 396, minWidth: 220, maxWidth: 396 }}>
                  {importantMomentsLoading && <div>Loading moments...</div>}
                  {importantMomentsError && <div style={{ color: 'red' }}>{importantMomentsError}</div>}
                  {!importantMomentsLoading && !importantMomentsError && Array.isArray(importantMoments) && importantMoments.length === 0 && (
                    <div>No important moments found for match.</div>
                  )}
                  {!importantMomentsLoading && !importantMomentsError && Array.isArray(importantMoments) && importantMoments.length > 0 && (
                    <table style={{ width:'99%', fontSize:'1.13rem', borderCollapse: 'collapse', marginBottom: 5, marginTop:8, boxShadow:'0 2px 12px #0000', borderRadius:10 }}>
                      <thead>
                        <tr style={{ background: '#f5f5f7' }}>
                          <th style={{ border: '1px solid #e5e5e6', padding: '3px 7px', fontWeight:600 }}>#</th>
                          <th style={{ border: '1px solid #e5e5e6', padding: '3px 7px', fontWeight:600 }}>When</th>
                          <th style={{ border: '1px solid #e5e5e6', padding: '3px 7px', fontWeight:600 }}>Who</th>
                          <th style={{ border: '1px solid #e5e5e6', padding: '3px 7px', fontWeight:600 }}>Type</th>
                          <th style={{ border: '1px solid #e5e5e6', padding: '3px 7px', fontWeight:600 }}>xG</th>
                          <th style={{ border: '1px solid #e5e5e6', padding: '3px 7px', fontWeight:600 }}>Outcome</th>
                          <th style={{ border: '1px solid #e5e5e6', padding: '3px 7px', fontWeight:600 }}>Poss.</th>
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
                            <td style={{ border: '1px solid #eee', padding: '2.5px 7px' }}>{idx + 1}</td>
                            <td style={{ border: '1px solid #eee', padding: '2.5px 7px' }}>{m.when}</td>
                            <td style={{ border: '1px solid #eee', padding: '2.5px 7px' }}>{m.who}</td>
                            <td style={{ border: '1px solid #eee', padding: '2.5px 7px' }}>{m.event_type}</td>
                            <td style={{ border: '1px solid #eee', padding: '2.5px 7px' }}>{m.xg !== undefined && m.xg !== null ? m.xg : ''}</td>
                            <td style={{ border: '1px solid #eee', padding: '2.5px 7px' }}>{m.outcome}</td>
                            <td style={{ border: '1px solid #eee', padding: '2.5px 7px' }}>{m.possession}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                {/* Scene Viewer */}
                {showImportantScenes && importantMoments.length > 0 && selectedMomentIdx !== null && (
                  <div style={{ flex:1, minWidth:430, marginLeft:24, borderRadius:22, background:'#fff', boxShadow:'0 1.5px 16px #bbb8', padding: '14px 18px 24px 18px', display:'flex', flexDirection:'column', alignItems:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', marginBottom:18, gap:13 }}>
                      <button onClick={handlePrev} disabled={selectedMomentIdx <= 0} style={{ fontSize: 26, fontWeight:600, width:48, height:44, borderRadius:7, background:'#fff', border:'1.5px solid #111', color:'#111', margin:'0 9px 0 0', boxShadow:'2px 2px 0 #4443', cursor:selectedMomentIdx<=0?'not-allowed':'pointer' }}>{'←'}</button>
                      <span style={{ fontSize: 19, fontWeight: 600 }}>
                        Moment {selectedMomentIdx + 1} of {importantMoments.length} (Possession {importantMoments[selectedMomentIdx]?.possession})
                      </span>
                      <button onClick={handleNext} disabled={selectedMomentIdx >= importantMoments.length - 1} style={{ fontSize: 26, fontWeight:600, width:48, height:44, borderRadius:7, background:'#fff', border:'1.5px solid #111', color:'#111', margin:'0 0 0 9px', boxShadow:'2px 2px 0 #4443', cursor:selectedMomentIdx >= importantMoments.length - 1 ?'not-allowed':'pointer' }}>{'→'}</button>
                    </div>
                    <div style={{ minHeight: 42, margin: '10px 0 18px', color: '#ad031c', fontWeight: 500 }}>
                      {sceneLoading && 'Loading scene...'}
                      {sceneError && sceneError}
                    </div>
                    {sceneImageBase64 && (
                      <img
                        src={`data:image/png;base64,${sceneImageBase64}`}
                        alt="Possession Scene"
                        style={{ maxWidth: '96%', margin: '10px auto', border: '2px solid #888', borderRadius:10, boxShadow:'0 6px 24px #0001' }}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
            {/* Game Phases Section (placeholder) */}
            <div style={{ margin: '52px 0 0', maxWidth:530 }}>
              <h2 style={{ fontSize: 24, fontWeight: 500, color:'#222', marginBottom: 3 }}>Game Phases</h2>
              <div style={{ color: '#aaa', fontSize: 21, fontWeight: 400, marginTop:11, marginBottom:26 }}>
                Nothing to see here yet. (will build in future)
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
