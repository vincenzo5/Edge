import type { DrawingPlugin } from '../plugin-api';
import { plotToPoint, pointToPlot } from '../drawingCoords';
import { plotWidth, PRICE_AXIS_WIDTH } from '../layout';
import { getColors } from '../renderer';
import { drawControlPoints, strokeFromStyles, HIT_TOLERANCE_PX } from './primitives';
import { baseDrawing } from './drawingUtils';
import { resolveDrawingStyles } from '../drawingStyles';

export const priceLine: DrawingPlugin = {
  name: 'price_line',
  defaultLabel: 'Price Line',
  placement: 'one-point',
  create(start) {
    return baseDrawing('price_line', 'Price Line', [start]);
  },
  draw(ctx, d, vp, theme, selected, candles, opts) {
    if (d.points.length < 1) return;
    const showTimeAxis = opts?.showTimeAxis ?? true;
    const pw = plotWidth(vp.width);
    const y = pointToPlot(d.points[0], vp, candles, showTimeAxis).y;
    const price = d.points[0].value ?? 0;
    const styles = resolveDrawingStyles(d, theme, selected);
    const { stroke, lineWidth } = strokeFromStyles(styles, theme, selected, opts?.preview);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(pw, y);
    ctx.stroke();
    const c = getColors(theme);
    ctx.fillStyle = c.lastPrice;
    ctx.fillRect(pw, y - 10, PRICE_AXIS_WIDTH, 20);
    ctx.fillStyle = '#fff';
    ctx.font = '10px sans-serif';
    ctx.fillText(price.toFixed(2), pw + 4, y + 4);
    if (selected && !opts?.preview) drawControlPoints(ctx, [{ x: pw / 2, y }], theme, true);
  },
  hitTest(px, py, d, vp, candles, showTimeAxis = true) {
    const y = pointToPlot(d.points[0], vp, candles, showTimeAxis).y;
    return Math.abs(py - y) <= HIT_TOLERANCE_PX;
  },
  getControlPoints(d, vp, candles, showTimeAxis = true) {
    const y = pointToPlot(d.points[0], vp, candles, showTimeAxis).y;
    return [{ x: plotWidth(vp.width) / 2, y }];
  },
  updateFromControl(d, _cpIndex, plotX, plotY, vp, candles, showTimeAxis = true) {
    const pt = plotToPoint(plotX, plotY, vp, candles, { showTimeAxis });
    return { ...d, points: [{ ...d.points[0], value: pt.value }] };
  },
};

export const annotation: DrawingPlugin = {
  name: 'annotation',
  defaultLabel: 'Note',
  placement: 'one-point',
  create(start) {
    const d = baseDrawing('annotation', 'Note', [start]);
    d.styles = { text: 'Note' };
    return d;
  },
  draw(ctx, d, vp, theme, selected, candles, opts) {
    if (d.points.length < 1) return;
    const showTimeAxis = opts?.showTimeAxis ?? true;
    const { x, y } = pointToPlot(d.points[0], vp, candles, showTimeAxis);
    const text = (d.styles as { text?: string })?.text ?? d.label ?? 'Note';
    ctx.font = '12px sans-serif';
    const metrics = ctx.measureText(text);
    const pad = 6;
    const w = metrics.width + pad * 2;
    const h = 20;
    const styles = resolveDrawingStyles(d, theme, selected);
    const { stroke, lineWidth } = strokeFromStyles(styles, theme, selected, opts?.preview);
    ctx.fillStyle = theme === 'dark' ? '#12131A' : '#f3f4f6';
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.fillRect(x, y - h, w, h);
    ctx.strokeRect(x, y - h, w, h);
    ctx.fillStyle = theme === 'dark' ? '#E8E9ED' : '#111827';
    ctx.fillText(text, x + pad, y - 6);
    if (selected && !opts?.preview) drawControlPoints(ctx, [{ x, y }], theme, true);
  },
  hitTest(px, py, d, vp, candles, showTimeAxis = true) {
    const { x, y } = pointToPlot(d.points[0], vp, candles, showTimeAxis);
    const text = (d.styles as { text?: string })?.text ?? d.label ?? 'Note';
    const w = text.length * 7 + 12;
    const h = 20;
    return px >= x && px <= x + w && py >= y - h && py <= y;
  },
  getControlPoints(d, vp, candles, showTimeAxis = true) {
    return [pointToPlot(d.points[0], vp, candles, showTimeAxis)];
  },
  updateFromControl(d, _cpIndex, plotX, plotY, vp, candles, showTimeAxis = true) {
    const pt = plotToPoint(plotX, plotY, vp, candles, { showTimeAxis });
    return {
      ...d,
      points: [{ timestamp: pt.timestamp, value: pt.value, dataIndex: pt.dataIndex }],
    };
  },
};
