import type { DrawingPlugin } from '../plugin-api';

export const rect: DrawingPlugin = {
  name: 'rectangle',
  create() { return { name: 'rectangle', label: 'Rect', points: [], visible: true, locked: false, zLevel: 0 } as any; },
  draw(ctx, d, vp, theme, selected) {
    ctx.strokeStyle = selected ? '#f59e0b' : '#64748b';
    ctx.strokeRect(100, 100, 120, 60); // stub
  },
  hitTest() { return false; },
};
