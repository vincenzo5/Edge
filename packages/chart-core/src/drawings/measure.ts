import type { DrawingPlugin } from '../plugin-api';
import type { SerializedDrawing } from '../contracts';
import {
  distanceToSegment,
  drawControlPoints,
  strokeFromStyles,
  HIT_TOLERANCE_PX,
} from './primitives';
import { plotToPoint } from '../drawingCoords';
import { plotsForPoints, baseDrawing } from './drawingUtils';
import { getChartColors as getColors } from '../themeTokens';
import { resolveDrawingStyles } from '../drawingStyles';

function formatMeasureLabel(d: SerializedDrawing): string {
  if (d.points.length < 2) return '';
  const [a, b] = d.points;
  const bars = Math.abs((b.dataIndex ?? 0) - (a.dataIndex ?? 0));
  const priceDelta = (b.value ?? 0) - (a.value ?? 0);
  const baseValue = a.value ?? 0;
  const pct = baseValue !== 0 ? (priceDelta / baseValue) * 100 : 0;
  const sign = priceDelta >= 0 ? '+' : '';
  return `${sign}${priceDelta.toFixed(2)} (${sign}${pct.toFixed(2)}%) · ${bars} bars`;
}

export const measure: DrawingPlugin = {
  name: 'measure',
  defaultLabel: 'Measure',
  placement: 'two-point',
  create(start) {
    return baseDrawing('measure', 'Measure', [start, { ...start }]);
  },
  updatePreview(draft, cursor) {
    const points = [...draft.points];
    if (points.length < 2) {
      points.push({
        timestamp: cursor.timestamp,
        value: cursor.value,
        dataIndex: cursor.dataIndex,
      });
    } else {
      points[1] = {
        timestamp: cursor.timestamp,
        value: cursor.value,
        dataIndex: cursor.dataIndex,
      };
    }
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
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    if (opts?.preview || dash.length > 0) ctx.setLineDash(opts?.preview ? [4, 4] : dash);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len > 0) {
      const nx = -dy / len;
      const ny = dx / len;
      const tickHalf = 3;
      for (let t = 0.15; t <= 0.85; t += 0.175) {
        const px = a.x + dx * t;
        const py = a.y + dy * t;
        ctx.beginPath();
        ctx.moveTo(px - nx * tickHalf, py - ny * tickHalf);
        ctx.lineTo(px + nx * tickHalf, py + ny * tickHalf);
        ctx.stroke();
      }
    }

    if (!opts?.preview && d.points.length >= 2) {
      const label = formatMeasureLabel(d);
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      ctx.font = '11px system-ui, sans-serif';
      const metrics = ctx.measureText(label);
      const padX = 6;
      const padY = 4;
      const boxW = metrics.width + padX * 2;
      const boxH = 18;
      const colors = getColors(theme);
      ctx.fillStyle = colors.axisBg;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(midX - boxW / 2, midY - boxH - 6, boxW, boxH, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = colors.text;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, midX, midY - boxH / 2 - 6);
    }

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
        : p,
    );
    return { ...d, points };
  },
};
