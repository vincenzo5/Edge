import { describe, it, expect } from 'vitest';
import {
  DRAWING_TOOLBAR_EDGE_PAD_PX,
  DRAWING_TOOLBAR_GAP_PX,
  resolveDrawingToolbarPosition,
} from './drawingSelectionToolbarPosition';

const toolbar = { width: 280, height: 36 };
const container = { width: 800, height: 400 };

describe('resolveDrawingToolbarPosition', () => {
  it('places toolbar above the drawing with a clear gap', () => {
    const pos = resolveDrawingToolbarPosition({
      bounds: { x: 200, y: 120, width: 100, height: 80 },
      toolbar,
      container,
    });
    expect(pos.placement).toBe('above');
    expect(pos.top).toBe(120 - DRAWING_TOOLBAR_GAP_PX - toolbar.height);
    expect(pos.left).toBe(200 + 50 - toolbar.width / 2);
    expect(120 - (pos.top + toolbar.height)).toBe(DRAWING_TOOLBAR_GAP_PX);
  });

  it('flips below when there is not enough room above', () => {
    const bounds = { x: 200, y: 40, width: 100, height: 60 };
    const pos = resolveDrawingToolbarPosition({
      bounds,
      toolbar,
      container,
    });
    expect(pos.placement).toBe('below');
    expect(pos.top).toBe(bounds.y + bounds.height + DRAWING_TOOLBAR_GAP_PX);
    expect(pos.top - (bounds.y + bounds.height)).toBe(DRAWING_TOOLBAR_GAP_PX);
  });

  it('keeps toolbar inside the container horizontally', () => {
    const pos = resolveDrawingToolbarPosition({
      bounds: { x: 0, y: 200, width: 20, height: 40 },
      toolbar,
      container,
    });
    expect(pos.left).toBe(DRAWING_TOOLBAR_EDGE_PAD_PX);
  });

  it('clamps to the top edge when neither side fits the full gap', () => {
    const pos = resolveDrawingToolbarPosition({
      bounds: { x: 200, y: 10, width: 100, height: 380 },
      toolbar,
      container: { width: 800, height: 400 },
    });
    expect(pos.top).toBeGreaterThanOrEqual(DRAWING_TOOLBAR_EDGE_PAD_PX);
    expect(pos.top + toolbar.height).toBeLessThanOrEqual(
      400 - DRAWING_TOOLBAR_EDGE_PAD_PX,
    );
  });

  it('applies drag offset then clamps', () => {
    const pos = resolveDrawingToolbarPosition({
      bounds: { x: 200, y: 200, width: 100, height: 40 },
      toolbar,
      container,
      dragOffset: { x: 5000, y: -5000 },
    });
    expect(pos.left).toBe(container.width - toolbar.width - DRAWING_TOOLBAR_EDGE_PAD_PX);
    expect(pos.top).toBe(DRAWING_TOOLBAR_EDGE_PAD_PX);
  });

  it('centers near the top when bounds are missing', () => {
    const pos = resolveDrawingToolbarPosition({
      bounds: null,
      toolbar,
      container,
    });
    expect(pos.placement).toBe('fallback');
    expect(pos.top).toBe(DRAWING_TOOLBAR_EDGE_PAD_PX);
    expect(pos.left).toBe(container.width / 2 - toolbar.width / 2);
  });
});
