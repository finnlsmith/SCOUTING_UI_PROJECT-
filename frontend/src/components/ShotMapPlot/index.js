import React from "react";
import Plot from "react-plotly.js";
import { PlotSkeleton } from "../LoadingSkeleton";

export default function ShotMapPlot({ displayFig, flipSides, plotLoading, smaller, customSize }) {
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
    ...(smaller ? { width: 590, height: 415 } : {}),
    ...(customSize ? { width: customSize.width, height: customSize.height } : {}),
  };
  return (
    <Plot
      data={displayFig.data}
      layout={flippedLayout}
      config={{ displayModeBar: false, responsive: !(smaller || customSize) }}
      {...(!(smaller || customSize) && { useResizeHandler: true })}
    />
  );
}