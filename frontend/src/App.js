import React from "react";
import { Routes, Route } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import TournamentsPage from "./components/TournamentsPage";
import MatchViz from "./components/MatchViz";
import AboutPage from "./components/AboutPage";
import Layout from "./components/Layout";
import ContactUsPage from "./components/ContactUs";
import "./App.css";

function App() {
  return (
    <div className="App" style={{ backgroundColor: "#0F0E26", minHeight: "100vh" }}>
      <Routes>
        <Route path="/" element={<Layout><LandingPage /></Layout>}/>
        <Route path="/tournaments" element={<Layout><TournamentsPage /></Layout>}/>
        <Route path="/euro-2020" element={<Layout><MatchViz /></Layout>} />
        <Route path="/about" element={<Layout><AboutPage /></Layout>}/>
        <Route path="/contact" element={<Layout><ContactUsPage /></Layout>}/>
      </Routes>
    </div>
  );
}

export default App;
