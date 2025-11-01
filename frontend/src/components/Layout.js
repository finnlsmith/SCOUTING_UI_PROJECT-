import React from "react";
import Sidebar from "./Sidebar";

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
      </div>
    </div>
  );
}
