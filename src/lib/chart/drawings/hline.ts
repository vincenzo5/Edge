import type { DrawingPlugin } from '../plugin-api';

export const hline: DrawingPlugin = {
  name: 'horizontal_line',
  create() { return { name: 'horizontal_line', label: 'HLine', points: [], visible: true, locked: false, zLevel: 0 } as any; },
  draw(ctx, d, vp) { /* draw horizontal at price */ },
  hitTest() { return false; },
};
