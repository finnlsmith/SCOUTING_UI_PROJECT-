import React from "react";
import Plot from "react-plotly.js";
import { PlotSkeleton } from "../LoadingSkeleton";

export default function ShotMapPlot({ displayFig, flipSides, plotLoading, smaller, customSize, fit }) {
  if (plotLoading) return <PlotSkeleton />;
  if (!displayFig || !displayFig.data || !displayFig.layout) {
    return null;
  }
  const flippedLayout = {
    ...displayFig.layout,
    xaxis: {
      ...(displayFig.layout?.xaxis || {}),
      range: flipSides ? [120,0] : [0,120],
    },
    responsive: !(smaller || customSize),
    ...(smaller ? { width: 950, height: 650 } : {}),
    ...(customSize ? { width: customSize.width, height: customSize.height } : {}),
  };
  if (fit) {
    // Fill the width of the parent (used when two charts sit side by side).
    // Drop the fixed pixel size from the figure and keep the pitch's 3:2 shape.
    const { width, height, ...rest } = flippedLayout;
    return (
      <Plot
        data={displayFig.data}
        layout={{ ...rest, autosize: true }}
        config={{ displayModeBar: false, responsive: true }}
        useResizeHandler
        style={{ width: "100%", aspectRatio: "3 / 2" }}
      />
    );
  }
  return (
    <Plot
      data={displayFig.data}
      layout={flippedLayout}
      config={{ displayModeBar: false, responsive: !(smaller || customSize) }}
      {...(!(smaller || customSize) && { useResizeHandler: true })}
    />
  );
}