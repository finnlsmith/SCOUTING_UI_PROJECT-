import React from "react";
import { useNavigate } from "react-router-dom";

export default function TournamentsPage() {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 64 }}>
      <h1 style={{ fontWeight: 700, fontSize: 32, marginBottom: 42 }}>Select a Tournament</h1>
      <button
        onClick={() => navigate('/euro-2020')}
        style={{ fontSize: 20, padding: '24px 60px', background: '#003cd1', color: 'white', border: 'none', borderRadius: 15, fontWeight: 600, cursor: 'pointer', margin: '24px 0', boxShadow: '0 4px 24px #0002'}}
      >
        Euro 2020
      </button>
      <div style={{ color: '#888', marginTop: 24 }}>
        (More tournaments coming soon)
      </div>
    </div>
  );
}
