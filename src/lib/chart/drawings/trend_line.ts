import type { DrawingPlugin } from '../plugin-api';
import type { SerializedDrawing, VisibleRange } from '../contracts';

export const trendLine: DrawingPlugin = {
  name: 'trend_line',
  create(start, vp) {
    return {
      name: 'trend_line',
      label: 'Trend',
      points: [{ timestamp: /* map x to t */ 0, value: 0 }],
      visible: true,
      locked: false,
      zLevel: 0,
    } as SerializedDrawing;
  },
  draw(ctx, d, vp, theme, selected) {
    ctx.strokeStyle = selected ? '#f59e0b' : '#64748b';
    ctx.lineWidth = 1.5;
    // draw line between points using vp mapping
    ctx.stroke();
  },
  hitTest(x, y, d, vp) {
    // 4px distance to line segment
    return false; // stub — implement distance formula
  },
};
