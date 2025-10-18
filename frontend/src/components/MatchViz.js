import React, { useState, useEffect } from "react";
import Plot from "react-plotly.js";

const TEAM_COLORS = {
  "Albania": "#E41F26",
  "Andorra": "#0033A0",
  "Armenia": "#D90012",
  "Austria": "#ED2939",
  "Azerbaijan": "#007FFF",
  "Belarus": "#E31A1C",
  "Belgium": "#FF0000",
  "Bosnia and Herzegovina": "#0066CC",
  "Bulgaria": "#FFD700",
  "Croatia": "#0057B8",
  "Cyprus": "#006A4E",
  "Czech Republic": "#0039A6",
  "Denmark": "#C60C30",
  "England": "#CF142B",
  "Estonia": "#0072CE",
  "Finland": "#003580",
  "France": "#1F14DE",
  "Germany": "#000000",
  "Greece": "#0000FF",
  "Hungary": "#CE1126",
  "Iceland": "#003897",
  "Ireland": "#009A49",
  "Italy": "#007FFF",
  "Netherlands": "#FF6600",
  "Poland": "#0057B8",
  "Portugal": "#006600",
  "Romania": "#0033A0",
  "Russia": "#0057B8",
  "Scotland": "#0033A0",
  "Spain": "#C60B1E",
  "Sweden": "#FFEC00",
  "Switzerland": "#FF0000",
  "Turkey": "#E30A17",
  "Ukraine": "#FFE000",
  "Wales": "#D80000",
};


// Use environment variable for backend URL
// const BACKEND_URL = "http://127.0.0.1:8000" || "http://localhost:8000";
const BACKEND_URL = "https://columbia-msds-f25-soccer.onrender.com";


// Error banner component
function ErrorBanner({ error, onClose }) {
  if (!error) return null;
  return (
    <div style={{
      backgroundColor: '#ffe7e7',
      color: '#b40000',
      border: '1px solid #ffbdbd',
      borderRadius: '6px',
      padding: '12px 30px 12px 16px',
      margin: '16px auto',
      maxWidth: 500,
      position: 'relative',
      textAlign: 'left',
      fontWeight: 500
    }}>
      <span>{error}</span>
      <button
        aria-label="Dismiss error"
        style={{
          position: 'absolute',
          right: 10,
          top: 10,
          background: 'none',
          border: 'none',
          color: '#b40000',
          fontWeight: 'bold',
          fontSize: 20,
          cursor: 'pointer',
        }}
        onClick={onClose}
      >
        ×
      </button>
    </div>
  );
}

export default function MatchViz() {
  const [selectedMatch, setSelectedMatch] = useState("");
  const [figData, setFigData] = useState(null);
  const [matches, setMatches] = useState([]); // match list from API/fake
  const [matchesLoading, setMatchesLoading] = useState(true); // NEW: Loading state for matches
  const [matchesError, setMatchesError] = useState(""); // NEW: Error state for match fetch
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(""); // NEW: Error state for upload
  const [uploadSuccess, setUploadSuccess] = useState(false); // NEW: Success after CSV upload
  const [plotLoading, setPlotLoading] = useState(false); // NEW: Plot data loading indicator
  const [flipSides, setFlipSides] = useState(false); // State for flipping plot
  const [homeTeam, setHomeTeam] = useState(null);
  const [awayTeam, setAwayTeam] = useState(null);
  const [score, setScore] = useState(null); // 🆕 combined formatted score
  const [isScoreVisible, setIsScoreVisible] = useState(false); // 🆕 for display toggle
  const [competitionStage, setCompetitionStage] = useState(null);
  const [shots, setShots] = useState(null);
  const [shotsOnTarget, setShotsOnTarget] = useState(null);
  const [xg, setXg] = useState(null);




  // Fetch available matches (MOCKED, swap for backend later)
  useEffect(() => {
    async function fetchMatches() {
      setMatchesLoading(true);
      setMatchesError("");
      try {
        // const endpoint = `${BACKEND_URL}/api/matches`;
        const endpoint = `${BACKEND_URL}/api/matches`.trim();
        console.log("🎯 Fetching matches from:", endpoint);
  
        const res = await fetch(endpoint);
        const text = await res.text(); // 👈 Read raw text for debug
  
        console.log("🧾 Raw response:", text);
  
        if (!res.ok) throw new Error(`HTTP ${res.status} - ${text}`);
  
        const data = JSON.parse(text); // 👈 Manually parse, ensures we catch format issues
  
        if (!Array.isArray(data)) {
          throw new Error("Invalid data format (expected an array)");
        }
  
        const formatted = data.map((m, i) => ({
          id: i,
          name: m.file.replace(".csv", ""),
          label: m.label,
          file: m.file
        }));        
  
        setMatches(formatted);
        console.log("✅ Matches loaded:", formatted);
      } catch (error) {
        console.error("❌ Fetch error:", error);
        setMatchesError("Failed to load matches. Please try again later.");
        setMatches([]);
      } finally {
        setMatchesLoading(false);
      }
    }
  
    fetchMatches();
  }, []);

  // Fetch minimal info and show blank pitch when a match is selected
  useEffect(() => {
    if (!selectedMatch) return;

    setPlotLoading(true);
    setFigData(null);
    setUploadSuccess(false);
    setUploadError("");

    fetch(`${BACKEND_URL}/api/match/${selectedMatch}/viz`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log("📦 Backend raw data:", data);
        // Use backend-provided team and score info
        if (data.home_team && data.away_team) {
          setHomeTeam(data.home_team);
          setAwayTeam(data.away_team);
          setIsScoreVisible(true);
        } else if (data.layout?.title?.text?.includes("vs")) {
          // fallback if backend didn’t send metadata
          const parts = data.layout.title.text.split("vs");
          setHomeTeam(parts[0].replace("Shot Map —", "").trim());
          setAwayTeam(parts[1].replace(/<br>.*/, "").trim());
          setIsScoreVisible(true);
        }
        if (data.competition_stage !== undefined && data.competition_stage !== null) {
          setCompetitionStage(data.competition_stage);
        } else {
          setCompetitionStage(null);
        }        
        if (data.home_shots !== undefined && data.away_shots !== undefined) {
          setShots(`${data.home_shots} - ${data.away_shots}`);
        } else {
          setShots(null);
        }
        if (
          data.home_shots_on_target !== undefined &&
          data.away_shots_on_target !== undefined
        ) {
          setShotsOnTarget(`${data.home_shots_on_target} - ${data.away_shots_on_target}`);
        } else {
          setShotsOnTarget(null);
        }
        
        if (
          data.home_xg_sum !== undefined &&
          data.away_xg_sum !== undefined
        ) {
          // Round to 2 decimals for display
          const homeXg = Number(data.home_xg_sum).toFixed(2);
          const awayXg = Number(data.away_xg_sum).toFixed(2);
          setXg(`${homeXg} - ${awayXg}`);
        } else {
          setXg(null);
        }
        
        // Normalize scores (accept numbers or numeric strings)
        const hs = data.home_score;
        const as = data.away_score;
        const hsNum = typeof hs === "string" ? Number(hs) : hs;
        const asNum = typeof as === "string" ? Number(as) : as;
        if (!Number.isNaN(hsNum) && hsNum !== null && !Number.isNaN(asNum) && asNum !== null) {
          setScore(`${hsNum} - ${asNum}`);
        } else {
          setScore(null);
        }

        // Render blank pitch with shapes only
        setFigData({
          data: [],
          layout: {
            ...data.layout,
            title: "Select a team to view their shot map",
          },
        });
      })
      .catch((err) => console.error("Backend fetch failed:", err))
      .finally(() => setPlotLoading(false));
  }, [selectedMatch]);

  // Fallback: derive team names from the selected option label if not provided by backend
  useEffect(() => {
    if (!selectedMatch || (homeTeam && awayTeam)) return;
    const m = matches.find((mm) => mm.file === selectedMatch);
    if (!m || !m.label) return;
    // Expected label format: "YYYY-MM-DD - Home vs Away – Tag"
    const match = m.label.match(/-\s*(.*?)\s+vs\s+(.*?)\s+–/);
    if (match && match[1] && match[2]) {
      setHomeTeam(match[1]);
      setAwayTeam(match[2]);
      setIsScoreVisible(true);
    }
  }, [selectedMatch, matches, homeTeam, awayTeam]);

  // Memoized derived team names from dropdown label as a final fallback
  const derivedTeams = React.useMemo(() => {
    if (!selectedMatch) return { home: null, away: null };
    const m = matches.find((mm) => mm.file === selectedMatch);
    if (!m || !m.label) return { home: null, away: null };
    const match = m.label.match(/-\s*(.*?)\s+vs\s+(.*?)\s+–/);
    if (match && match[1] && match[2]) {
      return { home: match[1], away: match[2] };
    }
    return { home: null, away: null };
  }, [matches, selectedMatch]);


  // If you want to auto-flip certain matches by default, uncomment this logic:
  /*
  useEffect(() => {
    // example: default checked for 'Turkey vs Italy'
    if (selectedMatch === "match_3788741_Turkey_shotmap.json") setFlipSides(true);
    else setFlipSides(false);
  }, [selectedMatch]);
  */

  // Handle CSV upload
  const handleUpload = async () => {
    setUploadError("");
    setUploadSuccess(false);
    if (!file) {
      setUploadError("Please choose a CSV file first!");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${BACKEND_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFigData(data);
      setUploadSuccess(true);
      setSelectedMatch(""); // clear dropdown since we're showing uploaded data
    } catch (err) {
      setUploadError("Upload failed: " + (err.message || err));
      setUploadSuccess(false);
    } finally {
      setUploading(false);
    }
  };

  // Top-level error state for ErrorBanner
  const [globalError, setGlobalError] = useState("");
  // Watch for either type of error and elevate to banner
  useEffect(() => {
    if (matchesError) setGlobalError(matchesError);
    else if (uploadError) setGlobalError(uploadError);
    else setGlobalError("");
  }, [matchesError, uploadError]);

  // Dismissing clears both error states
  function handleClearError() {
    setMatchesError("");
    setUploadError("");
    setGlobalError("");
  }

  async function fetchTeamShotmap(team) {
    try {
      setFlipSides(false);
      setPlotLoading(true);
      const res = await fetch(
        `${BACKEND_URL}/api/match/${selectedMatch}/viz?team=${encodeURIComponent(team)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
  
      // 🎨 Apply team color
      const teamColor = TEAM_COLORS[team] || "#1f77b4"; // fallback blue if not found
      const recoloredData = {
        ...data,
        data: data.data.map(trace => {
          if (trace.marker?.color?.array || trace.marker?.colorbar) {
            // Keep xG scaling but overlay base color
            return {
              ...trace,
              marker: {
                ...trace.marker,
                colorscale: [
                  [0, "white"],
                  [1, teamColor],
                ],
                colorbar: undefined, // optional: hide the xG bar if you want
              },
            };
          }
          return trace;
        }),
      };
  
      setFigData(recoloredData);
      console.log(`🎨 Applied color for ${team}: ${teamColor}`);
    } catch (err) {
      console.error("Team shotmap error:", err);
    } finally {
      setPlotLoading(false);
    }
  }
  async function fetchBothShotmaps() {
    try {
      setFlipSides(false);
      setPlotLoading(true);
  
      // Fetch both teams' shot maps concurrently
      const [homeRes, awayRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/match/${selectedMatch}/viz?team=${encodeURIComponent(homeTeam)}`),
        fetch(`${BACKEND_URL}/api/match/${selectedMatch}/viz?team=${encodeURIComponent(awayTeam)}`)
      ]);
  
      if (!homeRes.ok || !awayRes.ok) throw new Error("Error fetching team data");
  
      const [homeData, awayData] = await Promise.all([homeRes.json(), awayRes.json()]);

      console.log("📊 Raw homeData:", homeData);
      console.log("📊 Raw awayData:", awayData);

  
      // 🎨 Team colors
      const homeColor = TEAM_COLORS[homeTeam] || "#1f77b4";
      const awayColor = TEAM_COLORS[awayTeam] || "#ff7f0e";
  
      const PITCH_LENGTH = 120;
      const PITCH_WIDTH = 80;
  
      // 🧭 Flip the away team’s coordinates properly
      const flippedAwayData = {
        ...awayData,
        data: awayData.data.map(trace => {
          // Extract x and y robustly — works with typed arrays or encoded objects
          let xArr =
            trace.x?._inputArray ||
            trace.x?.bdata ||
            trace.x?.data ||
            trace.x;
          let yArr =
            trace.y?._inputArray ||
            trace.y?.bdata ||
            trace.y?.data ||
            trace.y;
      
          // Decode base64 if necessary (some responses use bdata with Float64 encoding)
          if (typeof xArr === "string") {
            try {
              const buffer = Uint8Array.from(atob(xArr), c => c.charCodeAt(0)).buffer;
              xArr = new Float64Array(buffer);
            } catch (e) {
              console.warn("Could not decode xArr from base64", e);
              xArr = [];
            }
          }
          if (typeof yArr === "string") {
            try {
              const buffer = Uint8Array.from(atob(yArr), c => c.charCodeAt(0)).buffer;
              yArr = new Float64Array(buffer);
            } catch (e) {
              console.warn("Could not decode yArr from base64", e);
              yArr = [];
            }
          }
      
          // Flip if we have numeric arrays
          if (xArr && yArr && xArr.length && yArr.length) {
            return {
              ...trace,
              x: Array.from(xArr, x => PITCH_LENGTH - x),
              y: Array.from(yArr, y => PITCH_WIDTH - y),
            };
          }
      
          console.log("⚠️ Skipped trace — could not extract coords:", trace);
          return trace;
        }),
      };      
  
      // 🎨 Apply team colors
      const recoloredHome = homeData.data.map(trace => ({
        ...trace,
        marker: {
          ...trace.marker,
          colorscale: [
            [0, "white"],
            [1, homeColor],
          ],
          showscale: false,
          opacity: 0.9,
        },
        // 👇 Label includes team and shot type (e.g. "Poland – Goal")
        name: `${homeTeam} – ${trace.name}`,
      }));
      
      const recoloredAway = flippedAwayData.data.map(trace => ({
        ...trace,
        marker: {
          ...trace.marker,
          colorscale: [
            [0, "white"],
            [1, awayColor],
          ],
          showscale: false,
          opacity: 0.7,
        },
        name: `${awayTeam} – ${trace.name}`,
      }));      
  
      // 🧩 Combine both into one figure
      const mergedFig = {
        data: [...recoloredHome, ...recoloredAway],
        layout: {
          ...(homeData.layout || {}),
          title: `Shot Map — ${homeTeam} (left) vs ${awayTeam} (right)`,
        },
      };
  
      console.log("✅ Both teams shot map rendered (away team flipped)");
      console.log("🏠 Home traces:", homeData.data.length);
      console.log("✈️ Away traces (before flip):", awayData.data.length);
      console.log("🔁 Flipped away traces (after flip):", flippedAwayData.data.map(t => ({
        name: t.name,
        xCount: t.x?.length,
        yCount: t.y?.length,
      })));
      setFigData(mergedFig);
    } catch (err) {
      console.error("Both teams shot map error:", err);
    } finally {
      setPlotLoading(false);
    }
  }
  
  // --- Plotly Flip Logic ---
  const PITCH_LENGTH = 120;
  const PITCH_WIDTH = 80;

  const displayFig = React.useMemo(() => {
    if (!figData) return null;
    if (!flipSides) return figData;
  
    console.log("✅ Flipping coordinates now...");
    const flipped = {
      ...figData,
      data: figData.data.map(trace => {
        // Try to safely extract numeric arrays from typed arrays
        const xArr = trace.x?._inputArray || trace.x;
        const yArr = trace.y?._inputArray || trace.y;
  
        if (Array.isArray(xArr) || xArr instanceof Float64Array) {
          const flippedTrace = {
            ...trace,
            x: Array.from(xArr, x => PITCH_LENGTH - x),
            y: Array.from(yArr, y => PITCH_WIDTH - y),
          };
          console.log(
            "Flipped first shot before/after:",
            xArr[0], "→", flippedTrace.x[0]
          );
          return flippedTrace;
        }
        return trace;
      }),
    };
  
    return flipped;
  }, [figData, flipSides]);
  
  

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      {/* Top-level app-wide errors */}
      <ErrorBanner error={globalError} onClose={handleClearError} />

      <h2>Select or Upload a Match</h2>

      {/* Upload Section */}
      <div style={{ marginBottom: "30px" }}>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files[0])}
          style={{ marginRight: "10px" }}
        />
        <button
          onClick={handleUpload}
          disabled={uploading}
          style={{
            padding: "8px 16px",
            fontSize: "15px",
            backgroundColor: uploading ? "#ccc" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: uploading ? "not-allowed" : "pointer",
          }}
        >
          {uploading ? "Uploading..." : "Upload CSV"}
        </button>
        {/* Success stays below button */}
        {uploadSuccess && <p style={{ color: "#009933", marginTop: 8 }}>Upload succeeded! See visualization below.</p>}
      </div>

      {/* Dropdown Section */}
      <div>
        <h3>Select a Match</h3>
        {matchesLoading ? (
          <p style={{ color: "#666" }}>Loading matches...</p>
        ) : (
          <>
            <select
              style={{ padding: "10px", fontSize: "16px", marginBottom: "20px" }}
              value={selectedMatch}
              onChange={(e) => {
                setSelectedMatch(e.target.value);
                setScore(null);
                setIsScoreVisible(false);
              }}
            >
              <option value="">-- Choose a match --</option>
              {matches.map((m) => (
                <option key={m.file} value={m.file}>
                  {m.label || m.name}
                </option>
              ))}
            </select>

            {/* Flip sides checkbox (shows only if a match is selected) */}
            {selectedMatch && (
              <label style={{ marginLeft: 18, userSelect: "none", fontWeight: 400 }}>
                <input
                  type="checkbox"
                  checked={flipSides}
                  onChange={(e) => setFlipSides(e.target.checked)}
                  style={{ marginRight: 7 }}
                />
                Flip Sides
              </label>
            )}
            {/* Reset button stays as before */}
            {(selectedMatch || figData || uploadSuccess) && (
              <button
                style={{
                  marginLeft: "16px",
                  padding: "8px 18px",
                  fontSize: "15px",
                  backgroundColor: "#e0e0e0",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  color: "#333",
                }}
                onClick={() => {
                  setSelectedMatch("");
                  setFigData(null);
                  setUploadSuccess(false);
                  setFile(null);
                  setUploadError("");
                  setMatchesError("");
                  setGlobalError("");
                  setFlipSides(false);
                }}
                aria-label="Reset selection and view"
              >
                Reset
              </button>
            )}
            {homeTeam && awayTeam && (
              <div style={{ marginTop: 20 }}>
                <button
                  onClick={() => fetchTeamShotmap(homeTeam)}
                  style={{ marginRight: 12, padding: "8px 14px" }}
                >
                  Shot Map – {homeTeam}
                </button>
                <button
                  onClick={() => fetchTeamShotmap(awayTeam)}
                  style={{ marginRight: 12, padding: "8px 14px" }}
                >
                  Shot Map – {awayTeam}
                </button>
                <button
                  onClick={() => fetchBothShotmaps()}
                  style={{
                    padding: "8px 14px",
                    backgroundColor: "#f0f0f0",
                    border: "1px solid #ccc",
                  }}
                >
                  Both Teams Shot Map
                </button>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Scoreboard Section (above visualization) */}
      {isScoreVisible && (
        <Scoreboard
          stage={competitionStage}
          home={homeTeam || derivedTeams.home || "Home"}
          away={awayTeam || derivedTeams.away || "Away"}
          score={score}
          shots={shots}
          shotsOnTarget={shotsOnTarget}
          xg={xg}
        />
      )}


      {/* Plot Section */}
      {plotLoading ? (
        <p style={{ color: "#007bff" }}>Loading visualization...</p>
      ) : displayFig ? (
        <Plot
          key={`${selectedMatch}-${homeTeam}-${awayTeam}-${flipSides ? "flipped" : "normal"}`} // forces full rerender
          data={[...(displayFig?.data || [])]}
          layout={{
            ...(displayFig?.layout || {}),
            title: {
              ...(displayFig?.layout?.title || {}),
              text: flipSides ? "Shot Map (Flipped)" : "Shot Map",
            },
            xaxis: { ...(displayFig?.layout?.xaxis || {}), autorange: true },
            yaxis: { ...(displayFig?.layout?.yaxis || {}), autorange: true },
          }}
          style={{ margin: "auto", width: "90%", height: "90%" }}
        />
      ) : (
        <p style={{ color: "#666" }}>No match selected or uploaded yet.</p>
      )}
    </div>
  );
}
