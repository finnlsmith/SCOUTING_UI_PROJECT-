import React from "react";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 110 }}>
      <h1 style={{ fontWeight: 800, fontSize: 38, marginBottom: 44, letterSpacing: 1 }}>Columbia MSDS 25 - Placeholder</h1>
      <button
        style={{ fontSize: 22, fontWeight: 600, padding: '20px 70px', background: '#003cd1', color: 'white', border: 'none', borderRadius: 15, margin: 22, boxShadow: '0 4px 24px #0001', cursor: 'pointer' }}
        onClick={() => navigate("/tournaments")}
      >
        Tournaments
      </button>
      <button
        style={{ fontSize: 22, fontWeight: 600, padding: '20px 70px', background: '#777', color: 'white', border: 'none', borderRadius: 15, margin: 22, boxShadow: '0 4px 24px #0001', cursor: 'not-allowed', opacity: 0.65 }}
        disabled
      >
        Players (coming soon)
      </button>
    </div>
  );
}
