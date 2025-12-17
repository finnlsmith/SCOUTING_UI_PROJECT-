import React from "react";

export default function TutorialPage() {
  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "60px 24px 80px",
        textAlign: "center",
        color: "var(--color-text-primary)",
      }}
    >
      <h1 style={{ marginBottom: 12 }}>Tutorial</h1>

      <p style={{ color: "var(--color-text-secondary)", marginBottom: 28 }}>
        This tutorial walks you through how to use ROARStats.
      </p>

      <div
        style={{
          display: "inline-block",
          textAlign: "left",
          background: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border-medium)",
          borderRadius: 12,
          padding: "18px 22px",
          minWidth: 360,
        }}
      >
        <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
          <li>Select a tournament</li>
          <li>Choose a match</li>
          <li>Explore key moments and match phases</li>
        </ol>
      </div>
    </div>
  );
}
