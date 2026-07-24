import type { VisibleRange } from '@edge/chart-core';
import type { ChartSettings } from './chartSettings';
import type { WheelAction } from '@edge/chart-core/wheel';

export type ViewportPersistSnapshot = {
  startIndex: number;
  endIndex: number;
  priceMin: number;
  priceMax: number;
  priceScaleMode?: 'auto' | 'manual';
};

/** Imperative API for multi-pane time sync without React re-renders. */
export type ChartPaneHandle = {
  paneId: string;
  syncTimeWindow: (startIndex: number, endIndex: number, force?: boolean) => void;
  applyWheelAction: (action: WheelAction, anchorX: number) => VisibleRange | null;
  getViewport: () => VisibleRange | null;
  resetViewport: () => VisibleRange | null;
  /** Reset Y to auto-fit, preserve time window, restore right margin at live edge. */
  resetPriceScale: (settingsOverride?: ChartSettings) => VisibleRange | null;
  /** Jump to a time window; emits viewport change (price pane drives sibling sync). */
  navigateToViewport: (startIndex: number, endIndex: number) => VisibleRange | null;
  /** Restore persisted zoom/pan snapshot (price pane only). */
  applyViewportSnapshot?: (snapshot: ViewportPersistSnapshot) => VisibleRange | null;
  isViewportModified: () => boolean;
  getLastDrawPhases?: () => import('./renderScheduler').DrawPhaseTimings | null;
};

export type RegisterPane = (handle: ChartPaneHandle) => () => void;
