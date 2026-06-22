import type { DrawingPlugin } from '../plugin-api';
import { plotToPoint } from '../drawingCoords';
import {
  previewDrawingStroke,
  drawControlPoints,
  fillFromStyles,
  strokeFromStyles,
  pointInRect,
} from './primitives';
import { baseDrawing, plotsForPoints, updateTwoPointPreview } from './drawingUtils';
import { resolveDrawingStyles } from '../drawingStyles';

export const rectangle: DrawingPlugin = {
  name: 'rectangle',
  defaultLabel: 'Rectangle',
  placement: 'two-point',
  create(start) {
    return baseDrawing('rectangle', 'Rectangle', [start, { ...start }]);
  },
  updatePreview(draft, cursor) {
    return updateTwoPointPreview(draft, cursor);
  },
  draw(ctx, d, vp, theme, selected, candles, opts) {
    if (d.points.length < 2) return;
    const showTimeAxis = opts?.showTimeAxis ?? true;
    const [a, b] = plotsForPoints(d, vp, candles, showTimeAxis);
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const w = Math.abs(b.x - a.x);
    const h = Math.abs(b.y - a.y);
    const styles = resolveDrawingStyles(d, theme, selected);
    const { stroke, lineWidth, dash } = strokeFromStyles(styles, theme, selected, opts?.preview);
    const fill = fillFromStyles(styles);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w, h);
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    if (opts?.preview || dash.length > 0) ctx.setLineDash(opts?.preview ? [4, 4] : dash);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
    if (selected && !opts?.preview) {
      drawControlPoints(ctx, [a, b], theme, true);
    }
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
      i === cpIndex
        ? { timestamp: pt.timestamp, value: pt.value, dataIndex: pt.dataIndex }
        : p
    );
    return { ...d, points };
  },
};
