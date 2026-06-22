import type { ContextMenuItem } from "./ContextMenu";

export type ChartContextMenuState = {
  viewportModified: boolean;
  drawingCount: number;
  indicatorCount: number;
  priceLabel: string | null;
};

export type ChartContextMenuActions = {
  resetView: () => void;
  copyPrice: (price: string) => void;
  openObjectTree: () => void;
  removeDrawings: () => void;
  removeIndicators: () => void;
};

function countLabel(count: number, singular: string, plural: string): string {
  return count === 1 ? `Remove 1 ${singular}` : `Remove ${count} ${plural}`;
}

export function buildChartContextMenuItems(
  state: ChartContextMenuState,
  actions: ChartContextMenuActions,
): ContextMenuItem[] {
  const items: ContextMenuItem[] = [
    {
      id: "reset-view",
      label: "Reset chart view",
      disabled: !state.viewportModified,
      action: actions.resetView,
      dividerAfter: true,
    },
  ];

  if (state.priceLabel) {
    items.push({
      id: "copy-price",
      label: `Copy price ${state.priceLabel}`,
      action: () => actions.copyPrice(state.priceLabel!),
      dividerAfter: true,
    });
  }

  items.push({
    id: "object-tree",
    label: "Object tree",
    action: actions.openObjectTree,
    dividerAfter: state.drawingCount > 0 || state.indicatorCount > 0,
  });

  if (state.drawingCount > 0) {
    items.push({
      id: "remove-drawings",
      label: countLabel(state.drawingCount, "drawing", "drawings"),
      danger: true,
      action: actions.removeDrawings,
      dividerAfter: state.indicatorCount > 0,
    });
  }

  if (state.indicatorCount > 0) {
    items.push({
      id: "remove-indicators",
      label: countLabel(state.indicatorCount, "indicator", "indicators"),
      danger: true,
      action: actions.removeIndicators,
    });
  }

  return items;
}
