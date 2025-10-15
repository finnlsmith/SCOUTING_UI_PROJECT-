import React, { useState, useEffect } from "react";
import Plot from "react-plotly.js";

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
        // Extract team names
        if (data.layout?.title?.text?.includes("vs")) {
          const parts = data.layout.title.text.split("vs");
          setHomeTeam(parts[0].replace("Shot Map —", "").trim());
          setAwayTeam(parts[1].replace(/<br>.*/, "").trim());
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
      setPlotLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/match/${selectedMatch}/viz?team=${encodeURIComponent(team)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setFigData(data);
    } catch (err) {
      console.error("Team shotmap error:", err);
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
        if (Array.isArray(trace.x) && Array.isArray(trace.y)) {
          const flippedTrace = {
            ...trace,
            x: trace.x.map(x => PITCH_LENGTH - x),
            y: trace.y.map(y => PITCH_WIDTH - y),
          };
          console.log(
            "Flipped trace sample:",
            flippedTrace.x?.slice(0, 3),
            flippedTrace.y?.slice(0, 3)
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
                  style={{ padding: "8px 14px" }}
                >
                  Shot Map – {awayTeam}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      console.log("🔁 Rendering Plot, flipSides =", flipSides);

      {/* Plot Section */}
      {plotLoading ? (
        <p style={{ color: "#007bff" }}>Loading visualization...</p>
      ) : displayFig ? (
        <Plot
          key={`${selectedMatch}-${flipSides}-${homeTeam}-${awayTeam}`} // 👈 re-renders only when flip toggles or teams change
          data={displayFig?.data || []}
          layout={{
            ...displayFig?.layout,
            title: {
              ...displayFig?.layout?.title,
              text: flipSides ? "Shot Map (Flipped)" : "Shot Map",
            },
          }}
          style={{ margin: "auto", width: "90%", height: "90%" }}
        />
      ) : (
        <p style={{ color: "#666" }}>No match selected or uploaded yet.</p>
      )}
    </div>
  );
}
