import { clampMenuPosition } from '../ContextMenu';

export const CHART_POPOVER_VIEWPORT_PADDING = 8;
export const CHART_POPOVER_ANCHOR_GAP = 4;

export type ChartAnchoredPopoverLayout = {
  x: number;
  y: number;
  maxHeight: number;
  scrollable: boolean;
};

export function computeChartAnchoredPopoverLayout(
  anchorRect: Pick<DOMRect, 'top' | 'bottom' | 'left' | 'right'>,
  panelWidth: number,
  contentHeight: number,
  align: 'start' | 'end',
  viewportWidth: number,
  viewportHeight: number,
): ChartAnchoredPopoverLayout {
  const spaceBelow =
    viewportHeight - anchorRect.bottom - CHART_POPOVER_ANCHOR_GAP - CHART_POPOVER_VIEWPORT_PADDING;
  const spaceAbove =
    anchorRect.top - CHART_POPOVER_ANCHOR_GAP - CHART_POPOVER_VIEWPORT_PADDING;

  const openAbove = contentHeight > spaceBelow && spaceAbove > spaceBelow;
  const available = Math.max(160, openAbove ? spaceAbove : spaceBelow);

  const maxHeight = Math.min(contentHeight, available);
  const visibleHeight = maxHeight;

  let y = openAbove
    ? anchorRect.top - CHART_POPOVER_ANCHOR_GAP - visibleHeight
    : anchorRect.bottom + CHART_POPOVER_ANCHOR_GAP;

  const rawX = align === 'end' ? anchorRect.right - panelWidth : anchorRect.left;
  const clamped = clampMenuPosition(
    { x: rawX, y },
    panelWidth,
    visibleHeight,
    viewportWidth,
    viewportHeight,
    CHART_POPOVER_VIEWPORT_PADDING,
  );

  const heightBudget =
    viewportHeight - clamped.y - CHART_POPOVER_VIEWPORT_PADDING;
  const finalMaxHeight = Math.max(160, Math.min(contentHeight, heightBudget));

  return {
    x: clamped.x,
    y: clamped.y,
    maxHeight: finalMaxHeight,
    scrollable: contentHeight > finalMaxHeight,
  };
}
