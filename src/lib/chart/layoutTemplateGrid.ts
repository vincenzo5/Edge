import type { CSSProperties } from "react";

import type { LayoutTemplate } from "./layoutTemplates";

export type LayoutGridStyles = {
  containerStyle: CSSProperties;
  cellStyles: CSSProperties[];
  stacked: boolean;
};

export function resolveLayoutGridStyles(
  template: LayoutTemplate,
  options: { stack: boolean },
): LayoutGridStyles {
  if (options.stack && template.columns > 1) {
    const order = template.stackOrder ?? template.cells.map((_, i) => i);
    const rowByCellIndex = new Map<number, number>();
    order.forEach((cellIndex, stackIndex) => {
      rowByCellIndex.set(cellIndex, stackIndex + 1);
    });
    return {
      stacked: true,
      containerStyle: {
        gridTemplateColumns: "minmax(0, 1fr)",
        gridTemplateRows: `repeat(${template.paneCount}, minmax(0, 1fr))`,
      },
      cellStyles: template.cells.map((_, cellIndex) => ({
        gridColumn: "1",
        gridRow: `${rowByCellIndex.get(cellIndex) ?? cellIndex + 1}`,
      })),
    };
  }

  return {
    stacked: false,
    containerStyle: {
      gridTemplateColumns: `repeat(${template.columns}, minmax(0, 1fr))`,
      gridTemplateRows: `repeat(${template.rows}, minmax(0, 1fr))`,
    },
    cellStyles: template.cells.map((cell) => ({
      gridColumn: `${cell.col + 1} / span ${cell.colSpan ?? 1}`,
      gridRow: `${cell.row + 1} / span ${cell.rowSpan ?? 1}`,
    })),
  };
}
