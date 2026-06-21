import type { IndicatorPlugin } from '../plugin-api';

export const rsi: IndicatorPlugin = {
  name: 'RSI',
  pane: 'sub',
  defaultParams: { period: 14 },
  draw(ctx, candles, vp, theme, params) {
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    // RSI line drawing (stub)
    ctx.beginPath();
    ctx.moveTo(10, vp.height / 2);
    ctx.lineTo(vp.width - 10, vp.height / 2);
    ctx.stroke();
  },
};
