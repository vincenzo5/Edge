import type { DrawingPlugin } from '../plugin-api';
import type { SerializedDrawing } from '../contracts';
import type { DrawingPoint } from '../drawingCoords';
import { pointToPlot, plotToPoint } from '../drawingCoords';
import {
  distanceToSegment,
  drawControlPoints,
  extendSegmentEndpoints,
  strokeFromStyles,
  HIT_TOLERANCE_PX,
} from './primitives';
import { plotsForPoints, baseDrawing } from './drawingUtils';
import { resolveDrawingStyles } from '../drawingStyles';

export const trendLine: DrawingPlugin = {
  name: 'trend_line',
  defaultLabel: 'Trend',
  placement: 'two-point',
  create(start) {
    return baseDrawing('trend_line', 'Trend', [start, { ...start }]);
  },
  updatePreview(draft, cursor) {
    const points = [...draft.points];
    if (points.length < 2) points.push({ timestamp: cursor.timestamp, value: cursor.value, dataIndex: cursor.dataIndex });
    else points[1] = { timestamp: cursor.timestamp, value: cursor.value, dataIndex: cursor.dataIndex };
    return { ...draft, points };
  },
  finalize(draft) {
    return draft;
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
    if (selected && !opts?.preview) {
      drawControlPoints(ctx, [a, b], theme, true);
    }
  },
  hitTest(px, py, d, vp, candles, showTimeAxis = true) {
    if (d.points.length < 2) return false;
    const [a, b] = plotsForPoints(d, vp, candles, showTimeAxis);
    return distanceToSegment(px, py, a.x, a.y, b.x, b.y) <= HIT_TOLERANCE_PX;
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
