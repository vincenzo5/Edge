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
};

const SUB_DEFAULT = 100;
const SUB_COLLAPSED = 24;

export function createInitialLayout(
  subKeys: string[],
  containerHeight: number,
  collapsed: Set<string>,
  maximized: string | null
): PaneLayout {
  const price: Pane = {
    id: 'candle_pane',
    key: 'price',
    height: maximized && maximized !== 'price' ? 0 : containerHeight * 0.6,
    top: 0,
    isCollapsed: collapsed.has('price'),
    isMaximized: maximized === 'price',
  };

  let y = price.height;
  const subs: Pane[] = subKeys.map((key, idx) => {
    const isMax = maximized === key;
    const isCol = collapsed.has(key);
    const h = isCol ? SUB_COLLAPSED : isMax ? containerHeight * 0.4 : SUB_DEFAULT;
    const p: Pane = {
      id: `sub_${idx}`,
      key,
      height: h,
      top: y,
      isCollapsed: isCol,
      isMaximized: isMax,
    };
    y += h;
    return p;
  });

  return { pricePane: price, subPanes: subs, totalHeight: y };
}

export function applyPaneHeights(layout: PaneLayout, heights: Map<string, number | null>) {
  // mutate heights for collapsed/maximized
  // (simplified for V1; full logic in EdgeChart)
  return layout;
}
