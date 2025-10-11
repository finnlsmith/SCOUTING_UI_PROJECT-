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

  // Fetch JSON when a match is selected
  useEffect(() => {
    if (selectedMatch) {
      fetch(`http://localhost:8000/api/match/${selectedMatch}/viz`)
        .then((res) => res.json())
        .then((data) => setFigData(data))
        .catch((err) => console.error("Error loading JSON:", err));
    }
  }, [selectedMatch]);

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
      const res = await fetch("http://localhost:8000/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setFigData(data);
      setSelectedMatch(""); // clear dropdown
    } catch (err) {
      console.error("Upload failed:", err);
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
          onChange={(e) => setSelectedMatch(e.target.value)}
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
