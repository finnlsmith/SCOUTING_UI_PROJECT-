import React from "react";
import uciLogo from "../assets/uci.jpeg";
import columbiaLogo from "../assets/columbia.png";
import nyuLogo from "../assets/nyu.jpeg";

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
      <div>
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
      </div>

      {/* --- Logos Section --- */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 80,
          marginTop: 100,
          marginBottom: 40,
        }}
      >
        <img
          src={uciLogo}
          alt="UCI"
          style={{
            width: 120,
            height: "auto",
            objectFit: "contain",
            filter: "brightness(0.9)",
          }}
        />
        <img
          src={columbiaLogo}
          alt="Columbia University"
          style={{
            width: 200,
            height: "auto",
            objectFit: "contain",
            filter: "brightness(0.95)",
          }}
        />
        <img
          src={nyuLogo}
          alt="NYU"
          style={{
            width: 120,
            height: "auto",
            objectFit: "contain",
            filter: "brightness(0.9)",
          }}
        />
      </div>
    </div>
  );
}