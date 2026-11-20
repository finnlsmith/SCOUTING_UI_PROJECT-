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
const PlayersLayout = lazy(() => import("./components/PlayersPage"));
const PlayersHome = lazy(() => import("./components/PlayersPage/PlayersHome"));
const PacePage = lazy(() => import("./components/PlayersPage/PacePage"));
const TechniquePage = lazy(() => import("./components/PlayersPage/TechniquePage"));
const PhoneBoothPage = lazy(() => import("./components/PlayersPage/PhoneBoothPage"));
const BallHoldingPage = lazy(() => import("./components/PlayersPage/BallHoldingPage"));
const FlipSidePage = lazy(() => import("./components/PlayersPage/FlipSidePage"));
const ActionVolumePage = lazy(() => import("./components/PlayersPage/ActionVolumePage"));
const TimeOnBallPage = lazy(() => import("./components/PlayersPage/TimeOnBallPage"));
const FreeSpacePage = lazy(() => import("./components/PlayersPage/FreeSpacePage"));
const TouchesPage = lazy(() => import("./components/PlayersPage/TouchesPage"));
const StandardStatsPage = lazy(() => import("./components/PlayersPage/StandardStatsPage"));
const GoalSidePage = lazy(() => import("./components/PlayersPage/GoalSidePage"));
const AboutCardPage = lazy(() => import("./components/PlayersPage/AboutCardPage"));
const ChapterPage = lazy(() => import("./components/PlayersPage/ChapterPage"));

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
          <Route path="/players" element={<Layout><PlayersLayout /></Layout>}>
            <Route index element={<PlayersHome />} />
            <Route path="about" element={<AboutCardPage />} />
            <Route path="pace" element={<PacePage />} />
            <Route path="tempo-and-technique" element={<TechniquePage />} />
            <Route path="phone-booth" element={<PhoneBoothPage />} />
            <Route path="ball-holding" element={<BallHoldingPage />} />
            <Route path="flip-side" element={<FlipSidePage />} />
            <Route path="action-volume" element={<ActionVolumePage />} />
            <Route path="time-on-ball" element={<TimeOnBallPage />} />
            <Route path="free-space" element={<FreeSpacePage />} />
            <Route path="touches" element={<TouchesPage />} />
            <Route path="standard-stats" element={<StandardStatsPage />} />
            <Route path="goal-side" element={<GoalSidePage />} />
            <Route path=":chapter" element={<ChapterPage />} />
          </Route>
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
