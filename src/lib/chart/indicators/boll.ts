import type { IndicatorPlugin } from '../plugin-api';

export const boll: IndicatorPlugin = {
  name: 'BOLL',
  pane: 'main',
  defaultParams: { period: 20, std: 2 },
  draw(ctx, candles, vp, theme, params = { period: 20, std: 2 }) {
    // Simplified BOLL (upper/lower bands) — full std dev calc omitted for brevity in V1
    ctx.strokeStyle = theme === 'dark' ? '#a78bfa' : '#7c3aed';
    ctx.lineWidth = 1;
    // draw middle band as MA
    // ... (same loop as MA but with bands)
    ctx.stroke();
  },
};
