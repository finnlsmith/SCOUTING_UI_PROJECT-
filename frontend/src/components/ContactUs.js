import React from "react";

export default function ContactUsPage() {
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
        Contact Us
      </h2>

      <div
        style={{
          maxWidth: 850,
          lineHeight: 1.7,
          fontSize: 18,
        }}
      >
        <p>
          If you’re interested to learn more about football statistics, data sources, or just chat about the
          beautiful game, don’t hesitate to reach out.
        </p>

        <p>
          You can find us on LinkedIn —{" "}
          <a
            href="https://www.linkedin.com/in/meyhar-sharma-b97a78211"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#4DA8FF",
              textDecoration: "none",
              fontWeight: 600,
            }}
            onMouseOver={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseOut={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            Meyhar
          </a>
          ,{" "}
          <a
            href="https://www.linkedin.com/in/stacyjchang/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#4DA8FF",
              textDecoration: "none",
              fontWeight: 600,
            }}
            onMouseOver={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseOut={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            Stacy
          </a>
          ,{" "}
          <a
            href="https://www.linkedin.com/in/zubair-atha/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#4DA8FF",
              textDecoration: "none",
              fontWeight: 600,
            }}
            onMouseOver={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseOut={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            Zubair
          </a>
          , or{" "}
          <a
            href="https://www.linkedin.com/in/finn-laister-smith/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#4DA8FF",
              textDecoration: "none",
              fontWeight: 600,
            }}
            onMouseOver={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseOut={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            Finn
          </a>
          . You can also leave your message below.
        </p>
      </div>
    </div>
  );
}
