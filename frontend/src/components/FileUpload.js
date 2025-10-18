import React from "react";

export default function FileUpload({ onFileChange, onUpload, uploading, uploadSuccess }) {
  return (
    <div style={{ marginBottom: "30px" }}>
      <input
        type="file"
        accept=".csv"
        onChange={onFileChange}
        style={{ marginRight: "10px" }}
      />
      <button
        onClick={onUpload}
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
      {uploadSuccess && (
        <p style={{ color: "#009933", marginTop: 8 }}>
          Upload succeeded! See visualization below.
        </p>
      )}
    </div>
  );
}
