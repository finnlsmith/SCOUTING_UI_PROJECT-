import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MatchViz from "./components/MatchViz";
import TournamentsPage from "./components/TournamentsPage";
import LandingPage from "./components/LandingPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/tournaments" element={<TournamentsPage />} />
        <Route path="/euro-2020" element={<MatchViz />} />
      </Routes>
    </Router>
  );
}

export default App;
