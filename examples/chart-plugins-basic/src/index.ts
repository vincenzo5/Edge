import type { Candle, IndicatorPlugin, SerializedDrawing } from "@edge/chart-core";
import type { DrawingPlugin } from "@edge/chart-core/plugin-api";
import { registerIndicator, getAllIndicators } from "@edge/chart-core/indicators";
import { registerDrawing, getAllDrawings } from "@edge/chart-core/drawings";
import { plotToPoint, pointToPlot } from "@edge/chart-core/drawingCoords";
import { HIT_TOLERANCE_PX } from "@edge/chart-core/drawings/primitives";

const hl2Indicator: IndicatorPlugin = {
  name: "HL2",
  category: "Other",
  description: "Midpoint of high and low (example plugin)",
  pane: "main",
  defaultInputs: {},
  compute(candles: Candle[]) {
    return { hl2: candles.map((c) => (c.h + c.l) / 2) };
  },
  outputs: [
    {
      id: "hl2",
      label: "HL2",
      key: "hl2",
      plot: "line",
      tooltip: "Example custom indicator",
      decimals: 2,
      color: "#f59e0b",
    },
  ],
  valueAt(index, candles) {
    if (index < 0 || index >= candles.length) return null;
    const c = candles[index]!;
    return (c.h + c.l) / 2;
  },
};

function makeDotDrawing(start: { dataIndex?: number; value?: number }): SerializedDrawing {
  return {
    id: `dot-${Date.now()}`,
    name: "dot_marker",
    label: "Dot",
    points: [start],
    visible: true,
    locked: false,
    zLevel: 0,
    paneId: "price",
  };
}

const dotMarker: DrawingPlugin = {
  name: "dot_marker",
  defaultLabel: "Dot",
  placement: "one-point",
  create(start) {
    return makeDotDrawing(start);
  },
  draw(ctx, d, vp, theme, selected, candles, opts) {
    if (d.points.length < 1) return;
    const showTimeAxis = opts?.showTimeAxis ?? true;
    const { x, y } = pointToPlot(d.points[0]!, vp, candles, showTimeAxis);
    ctx.fillStyle = selected ? (theme === "dark" ? "#58a6ff" : "#0969da") : "#f59e0b";
    ctx.beginPath();
    ctx.arc(x, y, selected ? 6 : 4, 0, Math.PI * 2);
    ctx.fill();
  },
  hitTest(px, py, d, vp, candles, showTimeAxis = true) {
    if (d.points.length < 1) return false;
    const { x, y } = pointToPlot(d.points[0]!, vp, candles, showTimeAxis);
    return Math.hypot(px - x, py - y) <= HIT_TOLERANCE_PX;
  },
  getControlPoints(d, vp, candles, showTimeAxis = true) {
    const { x, y } = pointToPlot(d.points[0]!, vp, candles, showTimeAxis);
    return [{ x, y, role: "anchor" }];
  },
  updateFromControl(d, _cpIndex, plotX, plotY, vp, candles, showTimeAxis = true) {
    const pt = plotToPoint(plotX, plotY, vp, candles, { showTimeAxis });
    return { ...d, points: [pt] };
  },
};

function main() {
  registerIndicator(hl2Indicator);
  registerDrawing(dotMarker);

  const hasHl2 = getAllIndicators().some((i) => i.name === "HL2");
  const hasDot = getAllDrawings().some((d) => d.name === "dot_marker");

  if (!hasHl2 || !hasDot) {
    throw new Error("Custom plugins were not registered");
  }

  console.log(`Registered custom indicator HL2 (${getAllIndicators().length} indicators)`);
  console.log(`Registered custom drawing dot_marker (${getAllDrawings().length} drawings)`);
  console.log("Plugin registration example passed.");
}

main();
