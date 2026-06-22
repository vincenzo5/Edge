import type { VisibleRange } from './contracts';
import type { ChartSettings } from './chartSettings';
import type { WheelAction } from './wheel';

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
  isViewportModified: () => boolean;
};

export type RegisterPane = (handle: ChartPaneHandle) => () => void;
