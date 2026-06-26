import type { DrawingPlugin } from '../plugin-api';
import type { PriceAxisAnnotation } from '../priceAxisTypes';
import { plotToPoint, pointToPlot } from '../drawingCoords';
import { plotWidth } from '../layout';
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
    const styles = resolveDrawingStyles(d, theme, selected);
    const { stroke, lineWidth } = strokeFromStyles(styles, theme, selected, opts?.preview);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(pw, y);
    ctx.stroke();
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
  axisAnnotations(d, vp, candles, theme, showTimeAxis = true): PriceAxisAnnotation[] {
    if (d.points.length < 1 || d.points[0].value == null) return [];
    const price = d.points[0].value;
    const styles = resolveDrawingStyles(d, theme, false);
    const color = styles.lineColor ?? (theme === 'dark' ? '#64748b' : '#475569');
    return [
      {
        id: `drawing:${d.id ?? d.name}:price`,
        paneId: d.paneId ?? 'price',
        source: 'drawing',
        value: price,
        label: price.toFixed(2),
        color,
        line: 'solid',
        showLabel: true,
        priority: 40,
      },
    ];
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
    const styles = resolveDrawingStyles(d, theme, selected);
    const text = styles.text ?? d.label ?? 'Note';
    const fontSize = styles.fontSize ?? 12;
    ctx.font = `${fontSize}px sans-serif`;
    const metrics = ctx.measureText(text);
    const pad = 6;
    const w = metrics.width + pad * 2;
    const h = fontSize + 12;
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
