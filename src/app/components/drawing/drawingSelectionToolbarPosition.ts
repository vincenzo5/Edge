export type ToolbarRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ToolbarPlacement = 'above' | 'below' | 'fallback';

/** Clearance between toolbar and drawing bounds (px). */
export const DRAWING_TOOLBAR_GAP_PX = 28;
/** Minimum inset from chart container edges (px). */
export const DRAWING_TOOLBAR_EDGE_PAD_PX = 8;

function clamp(n: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.max(min, Math.min(max, n));
}

/**
 * Prefer above the drawing with a clear gap; flip below when the viewport
 * cannot fit that gap; always clamp inside the container.
 */
export function resolveDrawingToolbarPosition(args: {
  bounds: ToolbarRect | null;
  toolbar: { width: number; height: number };
  container: { width: number; height: number };
  dragOffset?: { x: number; y: number };
  gap?: number;
  edgePad?: number;
}): { left: number; top: number; placement: ToolbarPlacement } {
  const gap = args.gap ?? DRAWING_TOOLBAR_GAP_PX;
  const edgePad = args.edgePad ?? DRAWING_TOOLBAR_EDGE_PAD_PX;
  const { width: tw, height: th } = args.toolbar;
  const { width: cw, height: ch } = args.container;
  const ox = args.dragOffset?.x ?? 0;
  const oy = args.dragOffset?.y ?? 0;

  const maxLeft = Math.max(edgePad, cw - tw - edgePad);
  const maxTop = Math.max(edgePad, ch - th - edgePad);

  if (!args.bounds) {
    return {
      left: clamp(cw / 2 - tw / 2 + ox, edgePad, maxLeft),
      top: clamp(edgePad + oy, edgePad, maxTop),
      placement: 'fallback',
    };
  }

  const { x, y, width, height } = args.bounds;
  const left = clamp(x + width / 2 - tw / 2 + ox, edgePad, maxLeft);

  const spaceAbove = y - edgePad;
  const spaceBelow = ch - (y + height) - edgePad;
  const needed = th + gap;

  let top: number;
  let placement: ToolbarPlacement;

  if (spaceAbove >= needed) {
    top = y - gap - th;
    placement = 'above';
  } else if (spaceBelow >= needed) {
    top = y + height + gap;
    placement = 'below';
  } else if (spaceAbove >= spaceBelow) {
    top = y - gap - th;
    placement = 'above';
  } else {
    top = y + height + gap;
    placement = 'below';
  }

  return {
    left,
    top: clamp(top + oy, edgePad, maxTop),
    placement,
  };
}
