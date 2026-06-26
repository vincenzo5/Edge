import type { DrawingPlugin } from '../plugin-api';
import { plotToPoint } from '../drawingCoords';
import { plotWidth } from '../layout';
import {
  distanceToRay,
  drawControlPoints,
  extendSegmentEndpoints,
  strokeFromStyles,
  HIT_TOLERANCE_PX,
} from './primitives';
import { baseDrawing, plotsForPoints, updateTwoPointPreview } from './drawingUtils';
import { resolveDrawingStyles } from '../drawingStyles';

export const ray: DrawingPlugin = {
  name: 'ray',
  defaultLabel: 'Ray',
  placement: 'two-point',
  create(start) {
    return baseDrawing('ray', 'Ray', [start, { ...start }]);
  },
  updatePreview(draft, cursor) {
    return updateTwoPointPreview(draft, cursor);
  },
  draw(ctx, d, vp, theme, selected, candles, opts) {
    if (d.points.length < 2) return;
    const showTimeAxis = opts?.showTimeAxis ?? true;
    const [a, b] = plotsForPoints(d, vp, candles, showTimeAxis);
    const styles = resolveDrawingStyles(d, theme, selected);
    const { stroke, lineWidth, dash } = strokeFromStyles(styles, theme, selected, opts?.preview);
    const seg = extendSegmentEndpoints(
      a.x,
      a.y,
      b.x,
      b.y,
      vp.width,
      vp.height,
      showTimeAxis,
      styles.extendLeft,
      styles.extendRight
    );
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    if (opts?.preview || dash.length > 0) ctx.setLineDash(opts?.preview ? [4, 4] : dash);
    ctx.beginPath();
    ctx.moveTo(seg.x1, seg.y1);
    ctx.lineTo(seg.x2, seg.y2);
    ctx.stroke();
    ctx.setLineDash([]);
    if (selected && !opts?.preview) drawControlPoints(ctx, [a, b], theme, true);
  },
  hitTest(px, py, d, vp, candles, showTimeAxis = true) {
    if (d.points.length < 2) return false;
    const [a, b] = plotsForPoints(d, vp, candles, showTimeAxis);
    const pw = plotWidth(vp.width);
    const ph = vp.height;
    return distanceToRay(px, py, a.x, a.y, b.x, b.y, pw, ph) <= HIT_TOLERANCE_PX;
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
