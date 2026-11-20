import React, { lazy } from "react";
import { Route } from "react-router-dom";

const PlayersLayout = lazy(() => import("./index"));
const PlayersHome = lazy(() => import("./PlayersHome"));
const PacePage = lazy(() => import("./PacePage"));
const TechniquePage = lazy(() => import("./TechniquePage"));
const PhoneBoothPage = lazy(() => import("./PhoneBoothPage"));
const BallHoldingPage = lazy(() => import("./BallHoldingPage"));
const FlipSidePage = lazy(() => import("./FlipSidePage"));
const ActionVolumePage = lazy(() => import("./ActionVolumePage"));
const TimeOnBallPage = lazy(() => import("./TimeOnBallPage"));
const FreeSpacePage = lazy(() => import("./FreeSpacePage"));
const TouchesPage = lazy(() => import("./TouchesPage"));
const StandardStatsPage = lazy(() => import("./StandardStatsPage"));
const GoalSidePage = lazy(() => import("./GoalSidePage"));
const AboutCardPage = lazy(() => import("./AboutCardPage"));
const ChapterPage = lazy(() => import("./ChapterPage"));

/** The /players route tree. `Wrap` is the page frame around it (the site Layout, or a bare frame in the offline file). */
export default function playersRoutes(Wrap) {
  return (
    <Route path="/players" element={<Wrap><PlayersLayout /></Wrap>}>
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
  );
}
