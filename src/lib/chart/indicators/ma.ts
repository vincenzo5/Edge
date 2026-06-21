import type { IndicatorPlugin } from '../plugin-api';
import type { Candle, VisibleRange, Theme } from '../contracts';

export const ma: IndicatorPlugin = {
  name: 'MA',
  pane: 'main',
  defaultParams: { period: 20 },
  draw(ctx, candles, vp, theme, params = { period: 20 }) {
    const period = params.period ?? 20;
    ctx.strokeStyle = theme === 'dark' ? '#60a5fa' : '#3b82f6';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let started = false;
    for (let i = vp.startIndex; i < vp.endIndex; i++) {
      if (i < period - 1) continue;
      const sum = candles.slice(i - period + 1, i + 1).reduce((s, c) => s + c.c, 0);
      const avg = sum / period;
      const x = vp.xForIndex(i);
      const y = vp.yForPrice(avg);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  },
};
