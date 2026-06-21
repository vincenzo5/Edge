import { PRICE_PANE_KEY } from '../chartConfig';

export type Pane = {
  id: string;
  key: string; // PRICE_PANE_KEY or indicatorKey
  height: number;
  top: number;
  isCollapsed: boolean;
  isMaximized: boolean;
};

export type PaneLayout = {
  /** Visual stacking order (top → bottom). */
  stack: Pane[];
  pricePane: Pane;
  subPanes: Pane[];
  totalHeight: number;
  separatorCount: number;
};

export type PaneBoundary = {
  /** Boundary between stack[i] and stack[i + 1]. */
  index: number;
  /** Y position of the separator (top of hit area). */
  top: number;
  disabled: boolean;
};

const SUB_DEFAULT = 100;
const SUB_COLLAPSED = 24;
export const MIN_PRICE_HEIGHT = 80;
export const MIN_SUB_HEIGHT = 48;

/** Visual height of the separator line between panes. */
export const PANE_SEPARATOR_HEIGHT = 3;
/** Total pointer hit target height (centered on the separator). */
export const PANE_SEPARATOR_HIT = 8;

function separatorSpace(paneCount: number): number {
  return paneCount > 1 ? (paneCount - 1) * PANE_SEPARATOR_HEIGHT : 0;
}

function minPaneHeight(key: string): number {
  return key === PRICE_PANE_KEY ? MIN_PRICE_HEIGHT : MIN_SUB_HEIGHT;
}

function resolveSubHeight(
  key: string,
  customHeights: Record<string, number> | undefined,
  isCol: boolean,
  isMax: boolean
): number {
  if (isCol) return SUB_COLLAPSED;
  if (isMax) return SUB_DEFAULT;
  const custom = customHeights?.[key];
  if (custom != null && Number.isFinite(custom)) {
    return Math.max(MIN_SUB_HEIGHT, Math.round(custom));
  }
  return SUB_DEFAULT;
}

/** Resolve visual stack order from persisted paneOrder + sub indicator keys. */
export function resolvePaneStackOrder(
  paneOrder: string[] | undefined,
  subKeys: string[]
): string[] {
  const fallback = [PRICE_PANE_KEY, ...subKeys];
  if (!paneOrder?.length) return fallback;

  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const key of paneOrder) {
    if (key !== PRICE_PANE_KEY && !subKeys.includes(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    ordered.push(key);
  }
  for (const key of fallback) {
    if (!seen.has(key)) ordered.push(key);
  }
  return ordered;
}

function shrinkableSlack(key: string, height: number): number {
  const floor = key === PRICE_PANE_KEY ? MIN_PRICE_HEIGHT : SUB_COLLAPSED;
  return Math.max(0, height - floor);
}

function shrinkOverflow(
  heights: Record<string, number>,
  stackOrder: string[],
  overflow: number,
  skipKey?: string
): void {
  const shrinkable = stackOrder
    .filter((k) => k !== skipKey)
    .reduce((sum, key) => sum + shrinkableSlack(key, heights[key]), 0);
  if (shrinkable <= 0) return;

  let remaining = overflow;
  for (const key of stackOrder) {
    if (key === skipKey) continue;
    const slack = shrinkableSlack(key, heights[key]);
    if (slack <= 0 || remaining <= 0) continue;
    const cut = Math.min(slack, Math.ceil((slack / shrinkable) * overflow));
    heights[key] -= cut;
    remaining -= cut;
  }
}

export function createInitialLayout(
  subKeys: string[],
  containerHeight: number,
  collapsed: Set<string>,
  maximized: string | null,
  customHeights?: Record<string, number>,
  paneOrder?: string[]
): PaneLayout {
  const stackOrder = resolvePaneStackOrder(paneOrder, subKeys);
  const paneCount = stackOrder.length;
  const sepSpace = separatorSpace(paneCount);
  const paneBudget = Math.max(0, containerHeight - sepSpace);

  const isPriceMax = maximized === PRICE_PANE_KEY;
  const isOtherMax = maximized != null && maximized !== PRICE_PANE_KEY;

  const heights: Record<string, number> = {};

  for (const key of stackOrder) {
    const isCol = collapsed.has(key);
    const isMax = maximized === key;

    if (key === PRICE_PANE_KEY) {
      if (isCol || isOtherMax) {
        heights[key] = SUB_COLLAPSED;
      } else if (paneCount === 1) {
        heights[key] = paneBudget;
      } else {
        heights[key] = 0; // flex — computed below
      }
    } else {
      heights[key] = resolveSubHeight(key, customHeights, isCol, isMax);
    }
  }

  if (isPriceMax) {
    for (const key of stackOrder) {
      if (key !== PRICE_PANE_KEY) {
        heights[key] = SUB_COLLAPSED;
      }
    }
    const othersSum = stackOrder
      .filter((k) => k !== PRICE_PANE_KEY)
      .reduce((sum, k) => sum + heights[k], 0);
    heights[PRICE_PANE_KEY] = Math.max(MIN_PRICE_HEIGHT, paneBudget - othersSum);
  } else if (isOtherMax) {
    heights[PRICE_PANE_KEY] = SUB_COLLAPSED;
    const maxKey = maximized!;
    for (const key of stackOrder) {
      if (key === PRICE_PANE_KEY || key === maxKey) continue;
      heights[key] = collapsed.has(key)
        ? SUB_COLLAPSED
        : resolveSubHeight(key, customHeights, false, false);
    }
    const othersSum = stackOrder
      .filter((k) => k !== maxKey)
      .reduce((sum, k) => sum + heights[k], 0);
    heights[maxKey] = Math.max(
      keyIsSub(maxKey) ? MIN_SUB_HEIGHT : MIN_PRICE_HEIGHT,
      paneBudget - othersSum
    );
  } else if (paneCount > 1) {
    const flexKey = stackOrder.find((k) => heights[k] === 0);

    if (flexKey) {
      const fixedSum = stackOrder.reduce(
        (sum, k) => sum + (heights[k] === 0 ? 0 : heights[k]),
        0
      );
      heights[flexKey] = Math.max(minPaneHeight(flexKey), paneBudget - fixedSum);

      let total = stackOrder.reduce((sum, k) => sum + heights[k], 0);
      if (total > paneBudget) {
        shrinkOverflow(heights, stackOrder, total - paneBudget, flexKey);
        total = stackOrder.reduce((sum, k) => sum + heights[k], 0);
        if (total > paneBudget) {
          heights[flexKey] = Math.max(
            minPaneHeight(flexKey),
            heights[flexKey] - (total - paneBudget)
          );
        }
      }
    } else {
      const overflow = stackOrder.reduce((sum, k) => sum + heights[k], 0) - paneBudget;
      if (overflow > 0) shrinkOverflow(heights, stackOrder, overflow);
    }
  }

  const stack: Pane[] = [];
  let y = 0;
  let subIdx = 0;

  for (const key of stackOrder) {
    const isCol = collapsed.has(key);
    const isMax = maximized === key;
    const pane: Pane = {
      id: key === PRICE_PANE_KEY ? 'candle_pane' : `sub_${subIdx}`,
      key,
      height: heights[key],
      top: y,
      isCollapsed: isCol,
      isMaximized: isMax,
    };
    if (key !== PRICE_PANE_KEY) subIdx += 1;
    stack.push(pane);
    y += pane.height;
    if (stack.length < paneCount) y += PANE_SEPARATOR_HEIGHT;
  }

  const pricePane = stack.find((p) => p.key === PRICE_PANE_KEY) ?? {
    id: 'candle_pane',
    key: PRICE_PANE_KEY,
    height: paneBudget,
    top: 0,
    isCollapsed: false,
    isMaximized: false,
  };
  const subPanes = stack.filter((p) => p.key !== PRICE_PANE_KEY);

  return {
    stack,
    pricePane,
    subPanes,
    totalHeight: y,
    separatorCount: Math.max(0, paneCount - 1),
  };
}

function keyIsSub(key: string): boolean {
  return key !== PRICE_PANE_KEY;
}

export function computePaneBoundaries(layout: PaneLayout): PaneBoundary[] {
  const boundaries: PaneBoundary[] = [];
  if (layout.stack.length < 2) return boundaries;

  let top = layout.stack[0].height;
  for (let i = 0; i < layout.stack.length - 1; i++) {
    const above = layout.stack[i];
    const below = layout.stack[i + 1];
    const hitTop = top + (PANE_SEPARATOR_HEIGHT - PANE_SEPARATOR_HIT) / 2;
    const disabled =
      above.isCollapsed ||
      above.isMaximized ||
      below.isCollapsed ||
      below.isMaximized;
    boundaries.push({ index: i, top: hitTop, disabled });
    top += PANE_SEPARATOR_HEIGHT + below.height;
  }

  return boundaries;
}

/**
 * Resize panes at a boundary by moving `deltaY` pixels from the pane below to the pane above.
 * Returns updated sub-pane heights for persistence (price height is always derived).
 */
export function applyBoundaryResize(
  subKeys: string[],
  subHeights: Record<string, number>,
  boundaryIndex: number,
  deltaY: number,
  containerHeight: number,
  collapsed: Set<string>,
  maximized: string | null,
  paneOrder?: string[]
): Record<string, number> | null {
  const layout = createInitialLayout(
    subKeys,
    containerHeight,
    collapsed,
    maximized,
    subHeights,
    paneOrder
  );
  if (boundaryIndex < 0 || boundaryIndex >= layout.stack.length - 1) return null;
  if (deltaY === 0) return null;

  const above = layout.stack[boundaryIndex];
  const below = layout.stack[boundaryIndex + 1];
  const minAbove = minPaneHeight(above.key);
  const minBelow = minPaneHeight(below.key);

  let newAbove = above.height + deltaY;
  let newBelow = below.height - deltaY;

  if (newAbove < minAbove) {
    const adjust = minAbove - newAbove;
    newAbove = minAbove;
    newBelow -= adjust;
  }
  if (newBelow < minBelow) {
    const adjust = minBelow - newBelow;
    newBelow = minBelow;
    newAbove -= adjust;
  }
  if (newAbove < minAbove || newBelow < minBelow) return null;

  const roundedAbove = Math.round(newAbove);
  const roundedBelow = Math.round(newBelow);
  if (roundedAbove === above.height && roundedBelow === below.height) return null;

  const next = { ...subHeights };
  if (above.key === PRICE_PANE_KEY) {
    if (!keyIsSub(below.key)) return null;
    next[below.key] = roundedBelow;
  } else if (below.key === PRICE_PANE_KEY) {
    next[above.key] = roundedAbove;
  } else {
    next[above.key] = roundedAbove;
    next[below.key] = roundedBelow;
  }
  return next;
}

export function applyPaneHeights(layout: PaneLayout, heights: Map<string, number | null>) {
  // mutate heights for collapsed/maximized
  // (simplified for V1; full logic in EdgeChart)
  return layout;
}
