import type { IndicatorKey } from '../../app/components/Chart'; // reuse existing type for now
import type { VisibleRange } from './contracts';

export type Pane = {
  id: string;
  key: string; // PRICE_PANE_KEY or indicatorKey
  height: number;
  top: number;
  isCollapsed: boolean;
  isMaximized: boolean;
};

export type PaneLayout = {
  pricePane: Pane;
  subPanes: Pane[];
  totalHeight: number;
  separatorCount: number;
};

export type PaneBoundary = {
  /** 0 = price/sub0, 1 = sub0/sub1, … */
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

function separatorSpace(subCount: number): number {
  return subCount * PANE_SEPARATOR_HEIGHT;
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

export function createInitialLayout(
  subKeys: string[],
  containerHeight: number,
  collapsed: Set<string>,
  maximized: string | null,
  customHeights?: Record<string, number>
): PaneLayout {
  const isPriceMax = maximized === 'price';
  const isOtherMax = maximized != null && maximized !== 'price';
  const sepSpace = separatorSpace(subKeys.length);
  const paneBudget = Math.max(0, containerHeight - sepSpace);

  const subs: Pane[] = subKeys.map((key, idx) => {
    const isMax = maximized === key;
    const isCol = collapsed.has(key);
    const h = resolveSubHeight(key, customHeights, isCol, isMax);
    return {
      id: `sub_${idx}`,
      key,
      height: h,
      top: 0,
      isCollapsed: isCol,
      isMaximized: isMax,
    };
  });

  let fixedSubsHeight = subs.reduce((sum, sub) => sum + sub.height, 0);

  let priceHeight: number;
  if (isOtherMax) {
    priceHeight = SUB_COLLAPSED;
  } else if (subKeys.length === 0) {
    priceHeight = paneBudget;
  } else {
    priceHeight = paneBudget - fixedSubsHeight;
  }

  if (subKeys.length > 0) {
    priceHeight = Math.max(MIN_PRICE_HEIGHT, priceHeight);
    const overflow = priceHeight + fixedSubsHeight - paneBudget;
    if (overflow > 0) {
      const shrinkable = subs.reduce(
        (sum, sub) => sum + Math.max(0, sub.height - SUB_COLLAPSED),
        0
      );
      if (shrinkable > 0) {
        let remaining = overflow;
        for (const sub of subs) {
          const slack = sub.height - SUB_COLLAPSED;
          if (slack <= 0 || remaining <= 0) continue;
          const cut = Math.min(slack, Math.ceil((slack / shrinkable) * overflow));
          sub.height -= cut;
          remaining -= cut;
        }
      }
      fixedSubsHeight = subs.reduce((sum, sub) => sum + sub.height, 0);
      priceHeight = Math.max(MIN_PRICE_HEIGHT, paneBudget - fixedSubsHeight);
    }
  }

  const price: Pane = {
    id: 'candle_pane',
    key: 'price',
    height: priceHeight,
    top: 0,
    isCollapsed: collapsed.has('price'),
    isMaximized: isPriceMax,
  };

  if (isOtherMax) {
    const maxSub = subs.find((s) => s.isMaximized);
    if (maxSub) {
      const othersHeight = subs
        .filter((s) => !s.isMaximized)
        .reduce((sum, s) => sum + s.height, 0);
      maxSub.height = Math.max(SUB_DEFAULT, paneBudget - priceHeight - othersHeight);
    }
  }

  let y = price.height;
  for (const sub of subs) {
    y += PANE_SEPARATOR_HEIGHT;
    sub.top = y;
    y += sub.height;
  }

  return {
    pricePane: price,
    subPanes: subs,
    totalHeight: y,
    separatorCount: subKeys.length,
  };
}

export function computePaneBoundaries(layout: PaneLayout): PaneBoundary[] {
  const boundaries: PaneBoundary[] = [];
  if (layout.subPanes.length === 0) return boundaries;

  let top = layout.pricePane.height;
  layout.subPanes.forEach((sub, i) => {
    const hitTop = top + (PANE_SEPARATOR_HEIGHT - PANE_SEPARATOR_HIT) / 2;
    const disabled =
      layout.pricePane.isCollapsed ||
      layout.pricePane.isMaximized ||
      sub.isCollapsed ||
      sub.isMaximized ||
      (i > 0 &&
        (layout.subPanes[i - 1].isCollapsed || layout.subPanes[i - 1].isMaximized));
    boundaries.push({ index: i, top: hitTop, disabled });
    top += PANE_SEPARATOR_HEIGHT + sub.height;
  });

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
  maximized: string | null
): Record<string, number> | null {
  if (deltaY === 0 || boundaryIndex < 0 || boundaryIndex >= subKeys.length) return null;

  const layout = createInitialLayout(subKeys, containerHeight, collapsed, maximized, subHeights);
  const paneHeights = [layout.pricePane.height, ...layout.subPanes.map((s) => s.height)];

  const aboveIdx = boundaryIndex;
  const belowIdx = boundaryIndex + 1;
  const minAbove = aboveIdx === 0 ? MIN_PRICE_HEIGHT : MIN_SUB_HEIGHT;
  const minBelow = MIN_SUB_HEIGHT;

  let newAbove = paneHeights[aboveIdx] + deltaY;
  let newBelow = paneHeights[belowIdx] - deltaY;

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

  const next = { ...subHeights };
  if (aboveIdx === 0) {
    const rounded = Math.round(newBelow);
    if (rounded === layout.subPanes[0].height) return null;
    next[subKeys[0]] = rounded;
  } else {
    const roundedAbove = Math.round(newAbove);
    const roundedBelow = Math.round(newBelow);
    if (
      roundedAbove === layout.subPanes[aboveIdx - 1].height &&
      roundedBelow === layout.subPanes[belowIdx - 1].height
    ) {
      return null;
    }
    next[subKeys[aboveIdx - 1]] = roundedAbove;
    next[subKeys[belowIdx - 1]] = roundedBelow;
  }
  return next;
}

export function applyPaneHeights(layout: PaneLayout, heights: Map<string, number | null>) {
  // mutate heights for collapsed/maximized
  // (simplified for V1; full logic in EdgeChart)
  return layout;
}
