import React, { useState, useEffect } from "react";
import Plot from "react-plotly.js";

export default function MatchViz() {
  const [selectedMatch, setSelectedMatch] = useState("");
  const [figData, setFigData] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Available mock matches (pretend these came from an API)
  const matches = [
    { id: 1, name: "Italy vs Turkey", file: "match_3788741_Italy_shotmap.json" },
    { id: 2, name: "Turkey vs Italy", file: "match_3788741_Turkey_shotmap.json" },
  ];

  // Use environment variable for backend URL
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

  // Fetch JSON when a match is selected
  useEffect(() => {
    if (selectedMatch) {  
      console.log("Fetching match:", selectedMatch); // Debug log
      
      // Try to fetch from backend first, fall back to mock data if it fails
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
          console.log("Using mock data:", mockData);
          setFigData(mockData);
        });
    }
  }, [selectedMatch, BACKEND_URL]);

  // Handle CSV upload
  const handleUpload = async () => {
    if (!file) {
      alert("Please choose a CSV file first!");
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
      console.log("Upload successful, received data:", data); // Debug log
      setFigData(data);
      setSelectedMatch(""); // clear dropdown since we're showing uploaded data
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
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
      </div>

      {/* Dropdown Section */}
      <div>
        <h3>Select a Match</h3>
        <select
          style={{ padding: "10px", fontSize: "16px", marginBottom: "20px" }}
          value={selectedMatch}
          onChange={(e) => {
            console.log("Dropdown changed to:", e.target.value); // Debug log
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
      </div>

      {/* Plot Section */}
      {figData ? (
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
