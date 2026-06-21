import type { DrawingPlugin } from '../plugin-api';
import { plotToPoint } from '../drawingCoords';
import { plotWidth } from '../layout';
import {
  distanceToRay,
  defaultDrawingStroke,
  previewDrawingStroke,
  drawControlPoints,
  extendRayToBounds,
  HIT_TOLERANCE_PX,
} from './primitives';
import { baseDrawing, plotsForPoints, updateTwoPointPreview } from './drawingUtils';

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
    const end = extendRayToBounds(a.x, a.y, b.x, b.y, vp.width, vp.height, showTimeAxis);
    ctx.strokeStyle = opts?.preview ? previewDrawingStroke() : defaultDrawingStroke(theme, selected);
    ctx.lineWidth = 1.5;
    if (opts?.preview) ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(end.x, end.y);
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
