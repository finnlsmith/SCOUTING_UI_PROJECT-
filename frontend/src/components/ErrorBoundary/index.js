import React from "react";
import { BACKEND_URL } from "../../config/api";

async function logErrorToServer(details) {
  try {
    await fetch(`${BACKEND_URL}/client-error`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(details),
      keepalive: true
    });
  } catch (e) {
    // Swallow errors to avoid recursive failures
    // eslint-disable-next-line no-console
    console.warn("Client error logging failed:", e);
  }
}

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    const details = {
      message: error?.message || String(error),
      stack: error?.stack || "",
      componentStack: info?.componentStack || "",
      url: typeof window !== "undefined" ? window.location.href : "",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      time: new Date().toISOString()
    };
    // eslint-disable-next-line no-console
    console.error("Caught by ErrorBoundary:", details);
    logErrorToServer(details);
  }

  handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#0F0E26", color: "white", padding: "24px" }}>
          <div style={{ maxWidth: 640, textAlign: "center", background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: 24, border: "1px solid rgba(255,255,255,0.12)" }}>
            <h1 style={{ margin: 0, marginBottom: 12 }}>Something went wrong</h1>
            <p style={{ marginTop: 0, opacity: 0.9 }}>
              The page encountered an unexpected error. You can try reloading the page.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={this.handleReload} style={{ background: "#4f46e5", color: "white", border: "none", padding: "10px 16px", borderRadius: 8, cursor: "pointer" }}>
                Reload page
              </button>
              <a href="mailto:support@example.com?subject=App%20Error%20Report" style={{ color: "#4f46e5", textDecoration: "underline", alignSelf: "center" }}>
                Report this issue
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}


