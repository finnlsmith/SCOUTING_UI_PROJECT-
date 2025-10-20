import React from "react";
import Plot from "react-plotly.js";

export default function ShotMapPlot({ displayFig, plotLoading }) {
  if (plotLoading) return <p style={{marginTop:12}}>Loading…</p>;
  if (!displayFig || !displayFig.data || !displayFig.layout) {
    return <p style={{marginTop:12, opacity:0.7}}>Select a match, then choose Shot Map or Passing Network.</p>;
  }
  return (
    <Plot
      data={displayFig.data}
      layout={{ ...displayFig.layout, responsive: true }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: "100%", height: "100%" }}
      useResizeHandler
    />
  );
}