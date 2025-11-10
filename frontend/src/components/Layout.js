import React from "react";
import Sidebar from "./Sidebar";
import { Link } from "react-router-dom";

export default function Layout({ children }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <div
        style={{
          flex: 1,
          color: "white",
          padding: "40px 60px",
        }}
      >
        {children}

        {/* Persistent footer links */}
        <footer
          style={{
            textAlign: "center",
            marginTop: "-80px",
            paddingTop: "15px",
            fontSize: "14px",
            opacity: 0.85,
          }}
        >
          <Link
            to="/about"
            style={{
              color: "#a9a9ff",
              textDecoration: "none",
              marginRight: "20px",
            }}
          >
            About
          </Link>
          <Link
            to="/contact"
            style={{
              color: "#a9a9ff",
              textDecoration: "none",
            }}
          >
            Contact Us
          </Link>
        </footer>
      </div>
    </div>
  );
}