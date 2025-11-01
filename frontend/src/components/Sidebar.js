import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const location = useLocation();

  const linkStyle = (path) => ({
    display: "block",
    backgroundColor: location.pathname === path ? "#4e6fa4" : "#3b5998",
    color: "white",
    fontWeight: 700,
    fontSize: 18,
    padding: "12px 20px",
    borderRadius: 6,
    marginBottom: 18,
    textDecoration: "none",
    transition: "0.2s",
  });

  return (
    <div
      style={{
        width: 220,
        backgroundColor: "#1c1b3a",
        color: "white",
        minHeight: "100vh",
        padding: "20px",
        boxSizing: "border-box",
        borderRight: "1.5px solid #000",
      }}
    >
      <h2
        style={{
          fontWeight: 800,
          fontSize: 20,
          marginBottom: 30,
          borderBottom: "2px solid #000",
          paddingBottom: 6,
        }}
      >
        Navigation
      </h2>

      <Link to="/" style={linkStyle("/")}>
        Home
      </Link>

      <Link
        to="#"
        style={{ ...linkStyle("#"), opacity: 0.6, cursor: "not-allowed" }}
      >
        Players (Coming Soon)
      </Link>

      <Link to="/tournaments" style={linkStyle("/tournaments")}>
        Tournaments
      </Link>
    </div>
  );
}
