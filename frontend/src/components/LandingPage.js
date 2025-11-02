import React from "react";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        margin: 0,
        padding: 0,
        backgroundColor: "#0F0E26", 
        transform: "translateY(-40px)",
      }}
    >
      <h1
        style={{
          fontWeight: 800,
          fontSize: 38,
          marginBottom: 44,
          letterSpacing: 1,
          color: "white",
        }}
      >
        Columbia MSDS 25 - Placeholder
      </h1>

      <button
        style={{
          fontSize: 22,
          fontWeight: 600,
          padding: "20px 70px",
          background: "#003cd1",
          color: "white",
          border: "none",
          borderRadius: 15,
          margin: 22,
          boxShadow: "0 4px 24px #0001",
          cursor: "pointer",
        }}
        onClick={() => navigate("/tournaments")}
      >
        Tournaments
      </button>

      <button
        style={{
          fontSize: 22,
          fontWeight: 600,
          padding: "20px 70px",
          background: "#777",
          color: "white",
          border: "none",
          borderRadius: 15,
          margin: 22,
          boxShadow: "0 4px 24px #0001",
          cursor: "not-allowed",
          opacity: 0.65,
        }}
        disabled
      >
        Players (coming soon)
      </button>
      
      {/* ✅ Bottom navigation links */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          display: "flex",
          gap: 24,
          fontSize: 16,
          color: "#aaa",
        }}
      >
        <div
          onClick={() => navigate("/about")}
          style={{
            cursor: "pointer",
            textDecoration: "underline",
            transition: "color 0.2s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseOut={(e) => (e.currentTarget.style.color = "#aaa")}
        >
          About
        </div>

        <div
          onClick={() => navigate("/contact")}
          style={{
            cursor: "pointer",
            textDecoration: "underline",
            transition: "color 0.2s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseOut={(e) => (e.currentTarget.style.color = "#aaa")}
        >
          Contact Us
        </div>
      </div>
    </div>
  );
}
