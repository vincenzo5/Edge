"use client";

import { useCallback } from "react";
import { indicatorKey } from "../EdgeChart";
import {
  PRICE_PANE_KEY,
  type CellConfig,
} from "@/lib/chartConfig";

type Params = {
  config: CellConfig;
  update: (patch: Partial<CellConfig>) => void;
};

export function usePaneLayoutActions({ config, update }: Params) {
  const getPaneOrder = useCallback(() => {
    const subKeys = config.indicators
      .filter((i) => i.pane === "sub")
      .map((i) => indicatorKey(i));
    return config.paneOrder && config.paneOrder.length > 0
      ? [...config.paneOrder]
      : [PRICE_PANE_KEY, ...subKeys];
  }, [config.indicators, config.paneOrder]);

  const handleCollapsePane = useCallback(
    (key: string) => {
      const currentCollapsed = new Set(config.collapsedPanes ?? []);
      if (currentCollapsed.has(key)) {
        currentCollapsed.delete(key);
      } else {
        currentCollapsed.add(key);
      }
      const nextMax = config.maximizedPane === key ? null : config.maximizedPane;
      update({
        collapsedPanes: Array.from(currentCollapsed),
        maximizedPane: nextMax,
      });
    },
    [config.collapsedPanes, config.maximizedPane, update],
  );

  const handleMaximizePane = useCallback(
    (key: string) => {
      const isCurrentlyMax = config.maximizedPane === key;
      const nextMax = isCurrentlyMax ? null : key;
      const nextCollapsed = new Set(config.collapsedPanes ?? []);
      nextCollapsed.delete(key);
      update({
        collapsedPanes: Array.from(nextCollapsed),
        maximizedPane: nextMax,
      });
    },
    [config.collapsedPanes, config.maximizedPane, update],
  );

  const handleMovePaneUp = useCallback(
    (key: string) => {
      const order = getPaneOrder();
      const idx = order.indexOf(key);
      if (idx <= 0) return;
      [order[idx], order[idx - 1]] = [order[idx - 1], order[idx]];
      update({ paneOrder: order });
    },
    [getPaneOrder, update],
  );

  const handleMovePaneDown = useCallback(
    (key: string) => {
      const order = getPaneOrder();
      const idx = order.indexOf(key);
      if (idx < 0 || idx >= order.length - 1) return;
      [order[idx], order[idx + 1]] = [order[idx + 1], order[idx]];
      update({ paneOrder: order });
    },
    [getPaneOrder, update],
  );

  const handlePaneHeightsChange = useCallback(
    (heights: Record<string, number>) => {
      update({ paneHeights: heights });
    },
    [update],
  );

  return {
    handleCollapsePane,
    handleMaximizePane,
    handleMovePaneUp,
    handleMovePaneDown,
    handlePaneHeightsChange,
  };
}
