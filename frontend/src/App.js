import React from "react";
import MatchViz from "./components/MatchViz";

function App() {
  return (
    <div style={{ backgroundColor: "#f9fafb", minHeight: "100vh" }}>
      <h1 style={{ textAlign: "center", paddingTop: "20px" }}>
        Football Analytics Dashboard (MVP)
      </h1>
      <MatchViz />
    </div>
  );
}

export default App;
