import type { IndicatorPlugin } from '../plugin-api';

export const macd: IndicatorPlugin = {
  name: 'MACD',
  pane: 'sub',
  defaultParams: { fast: 12, slow: 26, signal: 9 },
  draw(ctx, candles, vp, theme, params) {
    // MACD histogram + signal line drawing (stub for V1)
    ctx.fillStyle = theme === 'dark' ? '#4ade80' : '#22c55e';
    ctx.fillRect(10, 10, 40, 20); // placeholder
  },
};
