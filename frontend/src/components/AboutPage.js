import React from "react";

export default function AboutPage() {
  return (
    <div
      style={{
        color: "white",
        backgroundColor: "#0F0E26",
        minHeight: "100vh",
        padding: "80px 120px",
        fontFamily: "sans-serif",
        textAlign: "left",
      }}
    >
      <h2
        style={{
          fontWeight: 800,
          fontSize: 34,
          marginBottom: 40,
          textAlign: "left",
        }}
      >
        About
      </h2>

      <div
        style={{
          maxWidth: 850,
          lineHeight: 1.7,
          fontSize: 18,
        }}
      >
        <p>
          Every match tells a story. Our team of Columbia University Data Science
          students developed this dashboard as part of our capstone project.
        </p>
        <p>
          This project, in partnership with the Trilemma Foundation, reflects our
          shared mission to make data more interactive and actionable in the world
          of sports.
        </p>
        <p>
          Whether you’re a fan, a coach, or a curious analyst, this dashboard lets
          you experience the beautiful game from a whole new perspective.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 80,
          marginTop: 80,
        }}
      >
        {/* logo section can be added here */}
      </div>
    </div>
  );
}
