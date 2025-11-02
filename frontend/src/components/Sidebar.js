import React from "react";
import { Link, useLocation } from "react-router-dom";
import trilemmaLogo from "../assets/trilemma.jpeg";
import sincereLogo from "../assets/sincereFC.jpeg";

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
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* --- Top Navigation --- */}
      <div>
        <h2
          style={{
            fontWeight: 800,
            fontSize: 20,
            marginBottom: 30,
            borderBottom: "1px solid #333",
            paddingBottom: 6,
          }}
        >
          Navigation
        </h2>

        <nav style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
        </nav>
      </div>

      {/* --- Bottom Logos Section --- */}
      <div
        style={{
          borderTop: "1px solid #333",
          paddingTop: 15,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
          Powered by
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 12,
          }}
        >
          {/* Trilemma Foundation */}
          <a
            href="https://www.trilemma.foundation/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src={trilemmaLogo}
              alt="Trilemma Foundation"
              style={{
                width: 90,
                height: "auto",
                cursor: "pointer",
                transition: "opacity 0.2s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = "0.8")}
              onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
            />
          </a>

          {/* Sincere FC */}
          <a
            href="https://www.youtube.com/@SincereFC"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src={sincereLogo}
              alt="Sincere FC"
              style={{
                width: 55,
                height: "auto",
                cursor: "pointer",
                transition: "opacity 0.2s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = "0.8")}
              onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
            />
          </a>
        </div>
      </div>
    </div>
  );
}
