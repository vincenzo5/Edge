import type { VisibleRange } from './contracts';
import type { WheelAction } from './wheel';

/** Imperative API for multi-pane time sync without React re-renders. */
export type ChartPaneHandle = {
  paneId: string;
  syncTimeWindow: (startIndex: number, endIndex: number, force?: boolean) => void;
  applyWheelAction: (action: WheelAction, anchorX: number) => VisibleRange | null;
  getViewport: () => VisibleRange | null;
  resetViewport: () => VisibleRange | null;
  isViewportModified: () => boolean;
};

export type RegisterPane = (handle: ChartPaneHandle) => () => void;
