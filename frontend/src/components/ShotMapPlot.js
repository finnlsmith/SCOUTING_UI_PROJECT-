import React from "react";
import Plot from "react-plotly.js";

export default function ShotMapPlot({ displayFig, flipSides, plotLoading }) {
  if (plotLoading) return <p style={{marginTop:12}}>Loading…</p>;
  if (!displayFig || !displayFig.data || !displayFig.layout) {
    return <p style={{marginTop:12, opacity:0.7}}>Select a match, then choose Shot Map or Passing Network.</p>;
  }
  // Copy the layout so we don't mutate props
  const flippedLayout = {
    ...displayFig.layout,
    xaxis: {
      ...(displayFig.layout?.xaxis || {}),
      range: flipSides ? [120,0] : [0,120],
    },
    responsive: true,
  };
  return (
    <Plot
      data={displayFig.data}
      layout={flippedLayout}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: "100%", height: "100%" }}
      useResizeHandler
    />
  );
}