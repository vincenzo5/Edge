import type { DrawingPlugin } from '../plugin-api';
import { plotToPoint, pointToPlot } from '../drawingCoords';
import {
  distanceToSegment,
  drawControlPoints,
  fillFromStyles,
  strokeFromStyles,
  pointInRect,
  HIT_TOLERANCE_PX,
} from './primitives';
import { baseDrawing, plotsForPoints, updateTwoPointPreview } from './drawingUtils';
import { resolveDrawingStyles } from '../drawingStyles';

function parallelOffsetLine(
  a: { x: number; y: number },
  b: { x: number; y: number },
  offset: { x: number; y: number }
) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const dist =
    (offset.x - a.x) * nx + (offset.y - a.y) * ny;
  return {
    c: { x: a.x + nx * dist, y: a.y + ny * dist },
    d: { x: b.x + nx * dist, y: b.y + ny * dist },
  };
}

export const parallelChannel: DrawingPlugin = {
  name: 'parallel_channel',
  defaultLabel: 'Parallel Channel',
  placement: 'multi-point',
  maxControlPoints: 3,
  create(start) {
    return baseDrawing('parallel_channel', 'Parallel Channel', [start, { ...start }]);
  },
  updatePreview(draft, cursor) {
    if (draft.points.length < 2) return updateTwoPointPreview(draft, cursor);
    const points = [...draft.points];
    if (points.length === 2) {
      points.push({
        timestamp: cursor.timestamp,
        value: cursor.value,
        dataIndex: cursor.dataIndex,
      });
      return { ...draft, points };
    }
    points[2] = {
      timestamp: cursor.timestamp,
      value: cursor.value,
      dataIndex: cursor.dataIndex,
    };
    return { ...draft, points };
  },
  finalize(draft) {
    if (draft.points.length < 3) return draft;
    return draft;
  },
  draw(ctx, d, vp, theme, selected, candles, opts) {
    if (d.points.length < 2) return;
    const showTimeAxis = opts?.showTimeAxis ?? true;
    const plots = plotsForPoints(d, vp, candles, showTimeAxis);
    const [a, b] = plots;
    const styles = resolveDrawingStyles(d, theme, selected);
    const { stroke, lineWidth, dash } = strokeFromStyles(styles, theme, selected, opts?.preview);
    const fill = fillFromStyles(styles);
    if (fill && plots.length >= 3) {
      const { c, d: d2 } = parallelOffsetLine(a, b, plots[2]);
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(d2.x, d2.y);
      ctx.lineTo(c.x, c.y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    if (opts?.preview || dash.length > 0) ctx.setLineDash(opts?.preview ? [4, 4] : dash);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    if (plots.length >= 3) {
      const { c, d: d2 } = parallelOffsetLine(a, b, plots[2]);
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(d2.x, d2.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    if (selected && !opts?.preview) drawControlPoints(ctx, plots, theme, true);
  },
  hitTest(px, py, d, vp, candles, showTimeAxis = true) {
    if (d.points.length < 2) return false;
    const plots = plotsForPoints(d, vp, candles, showTimeAxis);
    const [a, b] = plots;
    if (distanceToSegment(px, py, a.x, a.y, b.x, b.y) <= HIT_TOLERANCE_PX) return true;
    if (plots.length >= 3) {
      const { c, d: d2 } = parallelOffsetLine(a, b, plots[2]);
      if (distanceToSegment(px, py, c.x, c.y, d2.x, d2.y) <= HIT_TOLERANCE_PX) return true;
    }
    return false;
  },
  getControlPoints(d, vp, candles, showTimeAxis = true) {
    return plotsForPoints(d, vp, candles, showTimeAxis);
  },
  updateFromControl(d, cpIndex, plotX, plotY, vp, candles, showTimeAxis = true) {
    const pt = plotToPoint(plotX, plotY, vp, candles, { showTimeAxis });
    const points = d.points.map((p, i) =>
      i === cpIndex ? { timestamp: pt.timestamp, value: pt.value, dataIndex: pt.dataIndex } : p
    );
    return { ...d, points };
  },
};

export const priceChannel: DrawingPlugin = {
  name: 'price_channel',
  defaultLabel: 'Price Channel',
  placement: 'two-point',
  create(start) {
    return baseDrawing('price_channel', 'Price Channel', [start, { ...start }]);
  },
  updatePreview(draft, cursor) {
    return updateTwoPointPreview(draft, cursor);
  },
  draw(ctx, d, vp, theme, selected, candles, opts) {
    if (d.points.length < 2) return;
    const showTimeAxis = opts?.showTimeAxis ?? true;
    const [a, b] = plotsForPoints(d, vp, candles, showTimeAxis);
    const x = Math.min(a.x, b.x);
    const w = Math.abs(b.x - a.x);
    const top = Math.min(a.y, b.y);
    const h = Math.abs(b.y - a.y);
    const styles = resolveDrawingStyles(d, theme, selected);
    const { stroke, lineWidth, dash } = strokeFromStyles(styles, theme, selected, opts?.preview);
    const fill = fillFromStyles(styles);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fillRect(x, top, w, h);
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    if (opts?.preview || dash.length > 0) ctx.setLineDash(opts?.preview ? [4, 4] : dash);
    ctx.strokeRect(x, top, w, h);
    ctx.setLineDash([]);
    if (selected && !opts?.preview) drawControlPoints(ctx, [a, b], theme, true);
  },
  hitTest(px, py, d, vp, candles, showTimeAxis = true) {
    if (d.points.length < 2) return false;
    const [a, b] = plotsForPoints(d, vp, candles, showTimeAxis);
    return pointInRect(px, py, a.x, a.y, b.x, b.y, true);
  },
  getControlPoints(d, vp, candles, showTimeAxis = true) {
    return plotsForPoints(d, vp, candles, showTimeAxis);
  },
  updateFromControl(d, cpIndex, plotX, plotY, vp, candles, showTimeAxis = true) {
    const pt = plotToPoint(plotX, plotY, vp, candles, { showTimeAxis });
    const points = d.points.map((p, i) =>
      i === cpIndex ? { timestamp: pt.timestamp, value: pt.value, dataIndex: pt.dataIndex } : p
    );
    return { ...d, points };
  },
};
