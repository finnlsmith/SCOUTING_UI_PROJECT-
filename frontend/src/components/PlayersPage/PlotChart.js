import React, { lazy, Suspense } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { PlotSkeleton } from "../LoadingSkeleton";

const Plot = lazy(() => import("react-plotly.js"));

const FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";

/** Colours for charts. Pace is a style, not good or bad, so "fast" is not green and "slow" is not red. */
export function chartColors(isDark) {
  return isDark
    ? { text: "#e5e7eb", grid: "rgba(255,255,255,0.12)", line: "rgba(255,255,255,0.45)", fast: "#9aa0ff", slow: "#6b7280", peer: "rgba(255,255,255,0.35)" }
    : { text: "#1f2937", grid: "rgba(0,0,0,0.10)", line: "rgba(0,0,0,0.45)", fast: "#3b46e0", slow: "#9ca3af", peer: "rgba(0,0,0,0.30)" };
}

/** 105 x 68 m pitch, origin in the centre (PFF coordinates). */
export function pitchShapes(color) {
  const line = { color, width: 1 };
  const rect = (x0, y0, x1, y1) => ({ type: "rect", x0, y0, x1, y1, line, layer: "below" });
  return [
    rect(-52.5, -34, 52.5, 34),
    { type: "line", x0: 0, y0: -34, x1: 0, y1: 34, line, layer: "below" },
    { type: "circle", x0: -9.15, y0: -9.15, x1: 9.15, y1: 9.15, line, layer: "below" },
    rect(-52.5, -20.16, -36, 20.16), rect(36, -20.16, 52.5, 20.16),
    rect(-52.5, -9.16, -47, 9.16), rect(47, -9.16, 52.5, 9.16),
  ];
}

/** Plotly chart that follows the light / dark theme and loads on demand. */
export default function PlotChart({ data, layout = {}, height = 320, className }) {
  const { isDark } = useTheme();
  const c = chartColors(isDark);
  return (
    <Suspense fallback={<PlotSkeleton />}>
      <Plot
        data={data}
        layout={{
          autosize: true,
          height,
          margin: { l: 52, r: 16, t: 12, b: 44 },
          paper_bgcolor: "rgba(0,0,0,0)",
          plot_bgcolor: "rgba(0,0,0,0)",
          font: { family: FONT, color: c.text, size: 12 },
          ...layout,
        }}
        config={{ displayModeBar: false, responsive: true }}
        useResizeHandler
        style={{ width: "100%", height }} /* explicit height: on a window resize Plotly re-measures this box, and without a height it collapses to 0 */
        className={className}
      />
    </Suspense>
  );
}
