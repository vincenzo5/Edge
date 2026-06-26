import type { DrawingPlugin } from '../plugin-api';
import { plotToPoint, pointToPlot } from '../drawingCoords';
import { plotHeight } from '../layout';
import { drawControlPoints, strokeFromStyles, HIT_TOLERANCE_PX } from './primitives';
import { baseDrawing, plotsForPoints } from './drawingUtils';
import { resolveDrawingStyles } from '../drawingStyles';

export const verticalLine: DrawingPlugin = {
  name: 'vertical_line',
  defaultLabel: 'V-Line',
  placement: 'one-point',
  create(start) {
    return baseDrawing('vertical_line', 'V-Line', [start]);
  },
  draw(ctx, d, vp, theme, selected, candles, opts) {
    if (d.points.length < 1) return;
    const showTimeAxis = opts?.showTimeAxis ?? true;
    const ph = plotHeight(vp.height, showTimeAxis);
    const x = pointToPlot(d.points[0], vp, candles, showTimeAxis).x;
    const styles = resolveDrawingStyles(d, theme, selected);
    const { stroke, lineWidth, dash } = strokeFromStyles(styles, theme, selected, opts?.preview);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    if (opts?.preview || dash.length > 0) ctx.setLineDash(opts?.preview ? [4, 4] : dash);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ph);
    ctx.stroke();
    ctx.setLineDash([]);
    if (selected && !opts?.preview) {
      drawControlPoints(ctx, [{ x, y: ph / 2 }], theme, true);
    }
  },
  hitTest(px, py, d, vp, candles, showTimeAxis = true) {
    const x = pointToPlot(d.points[0], vp, candles, showTimeAxis).x;
    return Math.abs(px - x) <= HIT_TOLERANCE_PX;
  },
  getControlPoints(d, vp, candles, showTimeAxis = true) {
    const x = pointToPlot(d.points[0], vp, candles, showTimeAxis).x;
    return [{ x, y: plotHeight(vp.height, showTimeAxis) / 2, role: 'time' }];
  },
  updateFromControl(d, _cpIndex, plotX, plotY, vp, candles, showTimeAxis = true) {
    const pt = plotToPoint(plotX, plotY, vp, candles, { showTimeAxis });
    return {
      ...d,
      points: [{ timestamp: pt.timestamp, value: pt.value, dataIndex: pt.dataIndex }],
    };
  },
};
