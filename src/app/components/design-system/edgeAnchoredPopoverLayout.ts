import { clampMenuPosition } from '@/app/components/ContextMenu';

export const EDGE_POPOVER_VIEWPORT_PADDING = 8;
export const EDGE_POPOVER_ANCHOR_GAP = 4;

export type EdgeAnchoredPopoverLayout = {
  x: number;
  y: number;
  maxHeight: number;
  scrollable: boolean;
};

export function isSameEdgeAnchoredPopoverLayout(
  a: EdgeAnchoredPopoverLayout | null,
  b: EdgeAnchoredPopoverLayout | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.x === b.x &&
    a.y === b.y &&
    a.maxHeight === b.maxHeight &&
    a.scrollable === b.scrollable
  );
}

export function computeEdgeAnchoredPopoverLayout(
  anchorRect: Pick<DOMRect, 'top' | 'bottom' | 'left' | 'right'>,
  panelWidth: number,
  contentHeight: number,
  align: 'start' | 'end',
  viewportWidth: number,
  viewportHeight: number,
): EdgeAnchoredPopoverLayout {
  const spaceBelow =
    viewportHeight - anchorRect.bottom - EDGE_POPOVER_ANCHOR_GAP - EDGE_POPOVER_VIEWPORT_PADDING;
  const spaceAbove =
    anchorRect.top - EDGE_POPOVER_ANCHOR_GAP - EDGE_POPOVER_VIEWPORT_PADDING;

  const openAbove = contentHeight > spaceBelow && spaceAbove > spaceBelow;
  const available = Math.max(160, openAbove ? spaceAbove : spaceBelow);

  const maxHeight = Math.min(contentHeight, available);
  const visibleHeight = maxHeight;

  let y = openAbove
    ? anchorRect.top - EDGE_POPOVER_ANCHOR_GAP - visibleHeight
    : anchorRect.bottom + EDGE_POPOVER_ANCHOR_GAP;

  const rawX = align === 'end' ? anchorRect.right - panelWidth : anchorRect.left;
  const clamped = clampMenuPosition(
    { x: rawX, y },
    panelWidth,
    visibleHeight,
    viewportWidth,
    viewportHeight,
    EDGE_POPOVER_VIEWPORT_PADDING,
  );

  const heightBudget =
    viewportHeight - clamped.y - EDGE_POPOVER_VIEWPORT_PADDING;
  const finalMaxHeight = Math.max(160, Math.min(contentHeight, heightBudget));

  return {
    x: clamped.x,
    y: clamped.y,
    maxHeight: finalMaxHeight,
    scrollable: contentHeight > finalMaxHeight,
  };
}
