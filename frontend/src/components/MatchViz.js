import React, { useState, useEffect } from "react";
import Plot from "react-plotly.js";

// Use environment variable for backend URL
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

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

  // Fetch available matches (MOCKED, swap for backend later)
  useEffect(() => {
    async function fetchMatches() {
      setMatchesLoading(true);
      setMatchesError("");
      try {
        // TODO: Replace this with a backend fetch later
        // const res = await fetch(`${BACKEND_URL}/api/matches`);
        // if (!res.ok) throw new Error(`HTTP ${res.status}`);
        // const data = await res.json();
        // setMatches(data);

        // Artificial delay for demo/loading indicator
        await new Promise(r => setTimeout(r, 500));
        setMatches([
          { id: 1, name: "Italy vs Turkey", file: "match_3788741_Italy_shotmap.json" },
          { id: 2, name: "Turkey vs Italy", file: "match_3788741_Turkey_shotmap.json" },
        ]);
      } catch (error) {
        setMatchesError("Failed to load matches. Please try again later.");
        setMatches([]);
      } finally {
        setMatchesLoading(false);
      }
    }
    fetchMatches();
  }, []);

  // Fetch JSON when a match is selected
  useEffect(() => {
    if (selectedMatch) {
      setPlotLoading(true);
      setFigData(null);
      // clear upload indicators when loading new match
      setUploadSuccess(false);
      setUploadError("");
      console.log("Fetching match:", selectedMatch); // Debug log

      fetch(`${BACKEND_URL}/api/match/${selectedMatch}/viz`)
        .then((res) => {
          console.log("Response status:", res.status); // Debug log
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          console.log("Received data from backend:", data); // Debug log
          setFigData(data);
        })
        .catch((err) => {
          console.error("Backend fetch failed, using mock data:", err);
          // Mock data for testing
          const mockData = {
            data: [{
              x: [1, 2, 3, 4],
              y: [10, 11, 12, 13],
              type: 'scatter',
              mode: 'lines+markers',
              marker: {color: 'red'},
              name: `Mock data for ${selectedMatch}`
            }],
            layout: {
              title: `Mock Visualization - ${selectedMatch}`,
              xaxis: { title: 'X Axis' },
              yaxis: { title: 'Y Axis' }
            }
          };
          setFigData(mockData);
        })
        .finally(() => setPlotLoading(false));
    }
  }, [selectedMatch, BACKEND_URL]);

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
                <option key={m.id} value={m.file}>
                  {m.name}
                </option>
              ))}
            </select>
            {/* Reset button shows only if a selection or plot is active, or after upload */}
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
                }}
                aria-label="Reset selection and view"
              >
                Reset
              </button>
            )}
          </>
        )}
      </div>

      {/* Plot Section - covers loading state and no data state! */}
      {plotLoading ? (
        <p style={{ color: "#007bff" }}>Loading visualization...</p>
      ) : figData ? (
        <Plot
          data={figData.data}
          layout={figData.layout}
          style={{ margin: "auto", width: "90%", height: "90%" }}
        />
      ) : (
        <p style={{ color: "#666" }}>No match selected or uploaded yet.</p>
      )}
    </div>
  );
}
