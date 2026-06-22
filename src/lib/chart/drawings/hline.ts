import type { DrawingPlugin } from '../plugin-api';
import { plotToPoint, pointToPlot } from '../drawingCoords';
import { plotWidth } from '../layout';
import { drawControlPoints, strokeFromStyles, HIT_TOLERANCE_PX } from './primitives';
import { baseDrawing, plotsForPoints } from './drawingUtils';
import { resolveDrawingStyles } from '../drawingStyles';

export const horizontalLine: DrawingPlugin = {
  name: 'horizontal_line',
  defaultLabel: 'H-Line',
  placement: 'one-point',
  create(start) {
    return baseDrawing('horizontal_line', 'H-Line', [start]);
  },
  draw(ctx, d, vp, theme, selected, candles, opts) {
    if (d.points.length < 1 || d.points[0].value == null) return;
    const showTimeAxis = opts?.showTimeAxis ?? true;
    const pw = plotWidth(vp.width);
    const y = pointToPlot(d.points[0], vp, candles, showTimeAxis).y;
    const styles = resolveDrawingStyles(d, theme, selected);
    const { stroke, lineWidth, dash } = strokeFromStyles(styles, theme, selected, opts?.preview);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    if (opts?.preview || dash.length > 0) ctx.setLineDash(opts?.preview ? [4, 4] : dash);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(pw, y);
    ctx.stroke();
    ctx.setLineDash([]);
    if (selected && !opts?.preview) {
      drawControlPoints(ctx, [{ x: pw / 2, y }], theme, true);
    }
  },
  hitTest(px, py, d, vp, candles, showTimeAxis = true) {
    if (d.points.length < 1) return false;
    const y = pointToPlot(d.points[0], vp, candles, showTimeAxis).y;
    return Math.abs(py - y) <= HIT_TOLERANCE_PX;
  },
  getControlPoints(d, vp, candles, showTimeAxis = true) {
    const y = pointToPlot(d.points[0], vp, candles, showTimeAxis).y;
    return [{ x: plotWidth(vp.width) / 2, y, role: 'price' }];
  },
  updateFromControl(d, _cpIndex, plotX, plotY, vp, candles, showTimeAxis = true) {
    const pt = plotToPoint(plotX, plotY, vp, candles, { showTimeAxis });
    return { ...d, points: [{ ...d.points[0], value: pt.value }] };
  },
};
