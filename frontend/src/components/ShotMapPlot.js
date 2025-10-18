import React from "react";
import Plot from "react-plotly.js";

export default function ShotMapPlot({ displayFig, flipSides, plotLoading }) {
  if (plotLoading) return <p style={{ color: "#007bff" }}>Loading visualization...</p>;
  if (!displayFig) return <p style={{ color: "#666" }}>No match selected or uploaded yet.</p>;

  return (
    <Plot
      key={flipSides ? "flipped" : "normal"}
      data={displayFig.data || []}
      layout={{
        ...(displayFig.layout || {}),
        title: {
          ...(displayFig.layout?.title || {}),
          text: flipSides ? "Shot Map (Flipped)" : "Shot Map",
        },
        xaxis: { ...(displayFig.layout?.xaxis || {}), autorange: true },
        yaxis: { ...(displayFig.layout?.yaxis || {}), autorange: true },
      }}
      style={{ margin: "auto", width: "90%", height: "90%" }}
    />
  );
}
