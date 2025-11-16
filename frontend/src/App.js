import React from "react";
import { Routes, Route } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import TournamentsPage from "./components/TournamentsPage";
import MatchViz from "./components/MatchViz";
import AboutPage from "./components/AboutPage";
import Layout from "./components/Layout";
import ContactUsPage from "./components/ContactUs";
import "./styles/variables.css";
import "./App.css";

function App() {
  return (
    <div className="App" style={{ backgroundColor: "var(--color-bg-primary)", minHeight: "100vh", transition: "background-color var(--transition-base)" }}>
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
