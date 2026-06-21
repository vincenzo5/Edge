import type { DrawingPlugin } from '../plugin-api';
import { plotToPoint } from '../drawingCoords';
import {
  defaultDrawingStroke,
  previewDrawingStroke,
  drawControlPoints,
  HIT_TOLERANCE_PX,
} from './primitives';
import { baseDrawing, plotsForPoints, updateTwoPointPreview } from './drawingUtils';

export const circle: DrawingPlugin = {
  name: 'circle',
  defaultLabel: 'Circle',
  placement: 'two-point',
  create(start) {
    return baseDrawing('circle', 'Circle', [start, { ...start }]);
  },
  updatePreview(draft, cursor) {
    return updateTwoPointPreview(draft, cursor);
  },
  draw(ctx, d, vp, theme, selected, candles, opts) {
    if (d.points.length < 2) return;
    const showTimeAxis = opts?.showTimeAxis ?? true;
    const [center, rim] = plotsForPoints(d, vp, candles, showTimeAxis);
    const rx = Math.abs(rim.x - center.x);
    const ry = Math.abs(rim.y - center.y);
    ctx.strokeStyle = opts?.preview ? previewDrawingStroke() : defaultDrawingStroke(theme, selected);
    ctx.lineWidth = 1.5;
    if (opts?.preview) ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.ellipse(center.x, center.y, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    if (selected && !opts?.preview) drawControlPoints(ctx, [center, rim], theme, true);
  },
  hitTest(px, py, d, vp, candles, showTimeAxis = true) {
    if (d.points.length < 2) return false;
    const [center, rim] = plotsForPoints(d, vp, candles, showTimeAxis);
    const rx = Math.max(Math.abs(rim.x - center.x), 1);
    const ry = Math.max(Math.abs(rim.y - center.y), 1);
    const norm = ((px - center.x) / rx) ** 2 + ((py - center.y) / ry) ** 2;
    const dist = Math.abs(Math.sqrt(norm) - 1) * Math.min(rx, ry);
    return dist <= HIT_TOLERANCE_PX;
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

export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

export function fibLevelPrice(p0: number, p1: number, ratio: number): number {
  return p0 + (p1 - p0) * ratio;
}

export const fibRetracement: DrawingPlugin = {
  name: 'fib_retracement',
  defaultLabel: 'Fib',
  placement: 'two-point',
  create(start) {
    return baseDrawing('fib_retracement', 'Fib', [start, { ...start }]);
  },
  updatePreview(draft, cursor) {
    return updateTwoPointPreview(draft, cursor);
  },
  draw(ctx, d, vp, theme, selected, candles, opts) {
    if (d.points.length < 2) return;
    const showTimeAxis = opts?.showTimeAxis ?? true;
    const pw = vp.width - 50;
    const p0 = d.points[0].value ?? 0;
    const p1 = d.points[1].value ?? 0;
    ctx.strokeStyle = opts?.preview ? previewDrawingStroke() : defaultDrawingStroke(theme, selected);
    ctx.lineWidth = 1;
    ctx.font = '10px sans-serif';
    ctx.fillStyle = theme === 'dark' ? '#8B8FA3' : '#64748b';
    for (const ratio of FIB_LEVELS) {
      const price = fibLevelPrice(p0, p1, ratio);
      const y = plotsForPoints(
        { ...d, points: [{ ...d.points[0], value: price }] },
        vp,
        candles,
        showTimeAxis
      )[0].y;
      ctx.setLineDash(ratio === 0 || ratio === 1 ? [] : [4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(pw, y);
      ctx.stroke();
      ctx.fillText(`${(ratio * 100).toFixed(1)}%`, pw - 40, y - 2);
    }
    ctx.setLineDash([]);
    if (selected && !opts?.preview) {
      const cps = plotsForPoints(d, vp, candles, showTimeAxis);
      drawControlPoints(ctx, cps, theme, true);
    }
  },
  hitTest(px, py, d, vp, candles, showTimeAxis = true) {
    if (d.points.length < 2) return false;
    const p0 = d.points[0].value ?? 0;
    const p1 = d.points[1].value ?? 0;
    for (const ratio of FIB_LEVELS) {
      const price = fibLevelPrice(p0, p1, ratio);
      const y = plotsForPoints(
        { ...d, points: [{ ...d.points[0], value: price }] },
        vp,
        candles,
        showTimeAxis
      )[0].y;
      if (Math.abs(py - y) <= HIT_TOLERANCE_PX) return true;
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
