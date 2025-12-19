import React, { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import "./styles/variables.css";
import "./App.css";

// Lazy load route components for code splitting
const LandingPage = lazy(() => import("./components/LandingPage"));
const TournamentsPage = lazy(() => import("./components/TournamentsPage"));
const MatchViz = lazy(() => import("./components/MatchViz"));
const AboutPage = lazy(() => import("./components/AboutPage"));
const ContactUsPage = lazy(() => import("./components/ContactUs"));
const TutorialPage = lazy(() => import("./components/TutorialPage"));

// Simple loading fallback
const RouteLoader = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    minHeight: '50vh',
    padding: '20px',
    color: 'var(--color-text-secondary)'
  }}>
    <div>Loading...</div>
  </div>
);

function App() {
  return (
    <div className="App" style={{ backgroundColor: "var(--color-bg-primary)", minHeight: "100vh", transition: "background-color var(--transition-base)" }}>
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/" element={<Layout><LandingPage /></Layout>}/>
          <Route path="/tournaments" element={<Layout><TournamentsPage /></Layout>}/>
          <Route path="/tutorial" element={<Layout><TutorialPage /></Layout>} />
          <Route path="/euro-2020" element={<Layout><MatchViz /></Layout>} />
          <Route path="/about" element={<Layout><AboutPage /></Layout>}/>
          <Route path="/contact" element={<Layout><ContactUsPage /></Layout>}/>
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
