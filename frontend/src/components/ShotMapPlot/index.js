import React, { useEffect, useRef } from "react";
import Plot from "react-plotly.js";
import { PlotSkeleton } from "../LoadingSkeleton";
import { UI_SCALE } from "../../config/ui";

const CHART_FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";

// Scales everything the figure draws in pixels (text, markers, line widths) by `s`, so a chart
// shrinks in step with the page around it.
function scaleNum(v, s) {
  if (Array.isArray(v)) return v.map(x => (typeof x === "number" ? x * s : x));
  return typeof v === "number" ? v * s : v;
}

function scaleTrace(trace, s) {
  const t = { ...trace };
  if (t.textfont && t.textfont.size) t.textfont = { ...t.textfont, size: scaleNum(t.textfont.size, s) };
  if (t.line && t.line.width) t.line = { ...t.line, width: scaleNum(t.line.width, s) };
  if (t.marker) {
    const m = { ...t.marker };
    if (m.size !== undefined) {
      if (m.sizemode === "area") {
        // Area-mode bubbles: diameter follows size/sizeref, so a bigger sizeref shrinks them
        if (m.sizeref) m.sizeref = m.sizeref / (s * s);
      } else {
        m.size = scaleNum(m.size, s);
      }
    }
    if (m.sizemin) m.sizemin = m.sizemin * s;
    if (m.line && m.line.width) m.line = { ...m.line, width: scaleNum(m.line.width, s) };
    t.marker = m;
  }
  return t;
}

function scaleLayout(layout, s) {
  const out = { ...layout };
  // Tight margins, so the pitch uses the frame instead of sitting in a sea of white
  out.margin = { l: 8 * s, r: 8 * s, b: 8 * s, t: 52 * s, pad: 0 };
  // Plotly's own defaults (12px text, 17px title) are scaled too, not only sizes the figure sets
  out.font = { ...(out.font || {}), size: ((out.font && out.font.size) || 12) * s };
  if (out.title) {
    const title = typeof out.title === "string" ? { text: out.title } : out.title;
    out.title = { ...title, font: { ...(title.font || {}), size: ((title.font && title.font.size) || 17) * s } };
  }
  // Legend text is deliberately large (22px before the page scale), whatever size the figure asked for
  if (out.showlegend !== false) {
    out.legend = { ...(out.legend || {}), font: { ...((out.legend && out.legend.font) || {}), size: 22 * s } };
  }
  if (Array.isArray(out.annotations)) {
    out.annotations = out.annotations.map(a => (a.font && a.font.size ? { ...a, font: { ...a.font, size: a.font.size * s } } : a));
  }
  return out;
}

// A chart that fills its parent and re-measures whenever the parent changes size (for example when a
// scrollbar appears, or the card around it finishes loading), not only when the window is resized.
function FitPlot({ data, layout, onPointClick }) {
  const box = useRef(null);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    let last = el.getBoundingClientRect().width;
    const observer = new ResizeObserver(() => {
      const width = el.getBoundingClientRect().width;
      if (Math.abs(width - last) > 1) {
        last = width;
        window.dispatchEvent(new Event("resize")); // react-plotly's resize handler listens for this
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={box} style={{ width: "100%" }}>
      <Plot
        data={data}
        layout={{ ...layout, autosize: true }}
        config={{ displayModeBar: false, responsive: true }}
        useResizeHandler
        onClick={onPointClick ? ev => ev.points && ev.points[0] && onPointClick(ev.points[0]) : undefined}
        style={{ width: "100%", aspectRatio: "3 / 2", cursor: onPointClick ? "pointer" : undefined }}
      />
    </div>
  );
}

export default function ShotMapPlot({ displayFig, flipSides, plotLoading, smaller, customSize, fit, hideTitle, onPointClick }) {
  if (plotLoading) return <PlotSkeleton />;
  if (!displayFig || !displayFig.data || !displayFig.layout) {
    return null;
  }
  const flippedLayout = {
    ...displayFig.layout,
    font: { ...(displayFig.layout?.font || {}), family: CHART_FONT },
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
    const { width, height, ...rest } = scaleLayout(flippedLayout, UI_SCALE);
    if (hideTitle) rest.title = undefined; // the page already shows a heading above the chart
    return <FitPlot data={displayFig.data.map(tr => scaleTrace(tr, UI_SCALE))} layout={rest} onPointClick={onPointClick} />;
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