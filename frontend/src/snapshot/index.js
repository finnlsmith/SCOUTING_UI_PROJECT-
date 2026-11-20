/**
 * Entry point of the offline file (built with SNAPSHOT=1, see scripts/build_players_html.py).
 * Only the Players section, in a hash router so it works from file://, reading every response from window.__SNAPSHOT__.
 */
import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import "../index.css";
import "../styles/variables.css";
import "../App.css";
import ErrorBoundary from "../components/ErrorBoundary";
import ThemeToggle from "../components/ThemeToggle";
import { ThemeProvider } from "../contexts/ThemeContext";
import playersRoutes from "../components/PlayersPage/playersRoutes";

function Frame({ children }) {
  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "16px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <b style={{ fontSize: 15, letterSpacing: "0.04em" }}>Sincere FC · Playing at speed · player card</b>
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
}

function OfflineApp() {
  return (
    <div style={{ backgroundColor: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Suspense fallback={<div style={{ padding: 40 }}>Loading…</div>}>
        <Routes>
          {playersRoutes(Frame)}
          <Route path="*" element={<Navigate to="/players/about" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}

// the page's own script puts the saved responses in window.__SNAPSHOT__ before this runs
ReactDOM.createRoot(document.getElementById("root")).render(
  <ThemeProvider>
    <HashRouter>
      <ErrorBoundary>
        <OfflineApp />
      </ErrorBoundary>
    </HashRouter>
  </ThemeProvider>
);
