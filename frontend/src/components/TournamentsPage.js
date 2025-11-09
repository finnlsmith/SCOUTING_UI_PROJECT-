import React from "react";
import { useNavigate } from "react-router-dom";
import euro2020 from "../assets/euro2020.jpeg";

export default function TournamentsPage() {
  const navigate = useNavigate();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: "#0F0E26",
        color: "white",
        margin: 0,
        padding: 0,
        transform: "translateY(-40px)",
      }}
    >
      <h1
        style={{
          fontWeight: 700,
          fontSize: 32,
          marginBottom: 42,
        }}
      >
        Select a Tournament
      </h1>

      <button
        onClick={() => navigate("/euro-2020")}
        style={{
          fontSize: 20,
          padding: "24px 60px",
          background: "#003cd1",
          color: "white",
          border: "none",
          borderRadius: 15,
          fontWeight: 600,
          cursor: "pointer",
          margin: "24px 0",
          boxShadow: "0 4px 24px #0002",
        }}
      >
        Euro 2020
      </button>

      <div style={{ color: "#bbb", marginTop: 24 }}>
        (More tournaments coming soon)
      </div>

      {/* Euro 2020 image fixed at bottom center */}
      <img
        src={euro2020}
        alt="Euro 2020"
        style={{
          position: "absolute",
          bottom: 50,
          left: "50%",
          transform: "translateX(-50%)",
          width: "80px",
          height: "auto",
          opacity: 0.9,
          borderRadius: 10,
          boxShadow: "0 4px 15px rgba(0, 0, 0, 0.4)",
        }}
      />
    </div>
  );
}
