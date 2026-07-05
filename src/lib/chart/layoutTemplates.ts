/**
 * Multi-chart layout template catalog (TradingView-style).
 * Single source of truth for pane geometry, menu icons, and cell counts.
 */

export type LayoutCellPlacement = {
  col: number;
  row: number;
  colSpan?: number;
  rowSpan?: number;
};

export type LayoutTemplate = {
  id: string;
  paneCount: number;
  columns: number;
  rows: number;
  cells: readonly LayoutCellPlacement[];
  stackOrder?: readonly number[];
};

export type LayoutTemplateId = LayoutTemplate["id"];

export const DEFAULT_LAYOUT_ID = "n1" as const;

export const LAYOUT_MENU_ROWS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16] as const;

const LEGACY_GRID_MODE_MAP: Record<string, LayoutTemplateId> = {
  "1x1": "n1",
  "2x1": "n2-rows",
  "1x2": "n2-cols",
  "3x1": "n3-rows",
  "2x2": "n4-grid-2x2",
};

function colsTemplate(id: string, n: number): LayoutTemplate {
  return {
    id,
    paneCount: n,
    columns: n,
    rows: 1,
    cells: Array.from({ length: n }, (_, i) => ({ col: i, row: 0 })),
  };
}

function rowsTemplate(id: string, n: number): LayoutTemplate {
  return {
    id,
    paneCount: n,
    columns: 1,
    rows: n,
    cells: Array.from({ length: n }, (_, i) => ({ col: 0, row: i })),
  };
}

function gridTemplate(id: string, columns: number, rows: number): LayoutTemplate {
  const cells: LayoutCellPlacement[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      cells.push({ col: c, row: r });
    }
  }
  return {
    id,
    paneCount: columns * rows,
    columns,
    rows,
    cells,
  };
}

function mainSideTemplate(
  id: string,
  paneCount: number,
  side: "left" | "right",
): LayoutTemplate {
  const rows = paneCount - 1;
  const cells: LayoutCellPlacement[] = [
    side === "left"
      ? { col: 0, row: 0, rowSpan: rows }
      : { col: 1, row: 0, rowSpan: rows },
  ];
  for (let i = 0; i < rows; i++) {
    cells.push(
      side === "left"
        ? { col: 1, row: i }
        : { col: 0, row: i },
    );
  }
  return { id, paneCount, columns: 2, rows, cells };
}

function mainTopBottomTemplate(
  id: string,
  bottomCount: number,
  mainOnTop: boolean,
): LayoutTemplate {
  const paneCount = 1 + bottomCount;
  const cells: LayoutCellPlacement[] = mainOnTop
    ? [{ col: 0, row: 0, colSpan: bottomCount }]
    : [];
  for (let i = 0; i < bottomCount; i++) {
    cells.push({ col: i, row: mainOnTop ? 1 : 0 });
  }
  if (!mainOnTop) {
    cells.push({ col: 0, row: 1, colSpan: bottomCount });
  }
  return {
    id,
    paneCount,
    columns: bottomCount,
    rows: 2,
    cells,
  };
}


function splitRowsTemplate(
  id: string,
  top: number,
  bottom: number,
): LayoutTemplate {
  const cells: LayoutCellPlacement[] = [];
  for (let i = 0; i < top; i++) {
    cells.push({ col: i, row: 0 });
  }
  for (let i = 0; i < bottom; i++) {
    cells.push({ col: i, row: 1 });
  }
  return {
    id,
    paneCount: top + bottom,
    columns: Math.max(top, bottom),
    rows: 2,
    cells,
  };
}

function mainTopGridTemplate(id: string, gridCols: number, gridRows: number): LayoutTemplate {
  const gridCount = gridCols * gridRows;
  const paneCount = 1 + gridCount;
  const cells: LayoutCellPlacement[] = [
    { col: 0, row: 0, colSpan: gridCols },
  ];
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      cells.push({ col: c, row: r + 1 });
    }
  }
  return {
    id,
    paneCount,
    columns: gridCols,
    rows: gridRows + 1,
    cells,
  };
}

function mainSideGridTemplate(
  id: string,
  side: "left" | "right",
  gridCols: number,
  gridRows: number,
): LayoutTemplate {
  const gridCount = gridCols * gridRows;
  const paneCount = 1 + gridCount;
  const totalCols = 1 + gridCols;
  const cells: LayoutCellPlacement[] = [
    side === "left"
      ? { col: 0, row: 0, rowSpan: gridRows }
      : { col: gridCols, row: 0, rowSpan: gridRows },
  ];
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      cells.push(
        side === "left"
          ? { col: c + 1, row: r }
          : { col: c, row: r },
      );
    }
  }
  return {
    id,
    paneCount,
    columns: totalCols,
    rows: gridRows,
    cells,
  };
}

export const LAYOUT_TEMPLATES: readonly LayoutTemplate[] = [
  // 1 pane
  gridTemplate("n1", 1, 1),

  // 2 panes
  colsTemplate("n2-cols", 2),
  rowsTemplate("n2-rows", 2),

  // 3 panes
  colsTemplate("n3-cols", 3),
  rowsTemplate("n3-rows", 3),
  mainSideTemplate("n3-main-left", 3, "left"),
  mainSideTemplate("n3-main-right", 3, "right"),
  mainTopBottomTemplate("n3-main-top", 2, true),
  mainTopBottomTemplate("n3-main-bottom", 2, false),

  // 4 panes
  gridTemplate("n4-grid-2x2", 2, 2),
  colsTemplate("n4-cols", 4),
  rowsTemplate("n4-rows", 4),
  mainSideTemplate("n4-main-left", 4, "left"),
  mainSideTemplate("n4-main-right", 4, "right"),
  mainTopBottomTemplate("n4-main-top", 3, true),
  mainTopBottomTemplate("n4-main-bottom", 3, false),
  {
    id: "n4-split-3-1",
    paneCount: 4,
    columns: 3,
    rows: 2,
    cells: [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 },
      { col: 0, row: 1, colSpan: 3 },
    ],
  },
  {
    id: "n4-split-1-3",
    paneCount: 4,
    columns: 3,
    rows: 2,
    cells: [
      { col: 0, row: 0, colSpan: 3 },
      { col: 0, row: 1 },
      { col: 1, row: 1 },
      { col: 2, row: 1 },
    ],
  },
  {
    id: "n4-band-1-1-2",
    paneCount: 4,
    columns: 2,
    rows: 3,
    cells: [
      { col: 0, row: 0, colSpan: 2 },
      { col: 0, row: 1, colSpan: 2 },
      { col: 0, row: 2 },
      { col: 1, row: 2 },
    ],
  },

  // 5 panes
  colsTemplate("n5-cols", 5),
  rowsTemplate("n5-rows", 5),
  mainSideTemplate("n5-main-left", 5, "left"),
  mainSideTemplate("n5-main-right", 5, "right"),
  {
    id: "n5-split-3-2",
    paneCount: 5,
    columns: 6,
    rows: 2,
    cells: [
      { col: 0, row: 0, colSpan: 2 },
      { col: 2, row: 0, colSpan: 2 },
      { col: 4, row: 0, colSpan: 2 },
      { col: 0, row: 1, colSpan: 3 },
      { col: 3, row: 1, colSpan: 3 },
    ],
  },
  {
    id: "n5-split-2-3",
    paneCount: 5,
    columns: 3,
    rows: 2,
    cells: [
      { col: 0, row: 0, colSpan: 1 },
      { col: 1, row: 0, colSpan: 2 },
      { col: 0, row: 1 },
      { col: 1, row: 1 },
      { col: 2, row: 1 },
    ],
  },
  mainTopBottomTemplate("n5-main-top", 4, true),
  mainTopBottomTemplate("n5-main-bottom", 4, false),
  mainTopGridTemplate("n5-main-top-2x2", 2, 2),
  {
    id: "n5-split-4-1",
    paneCount: 5,
    columns: 4,
    rows: 2,
    cells: [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 },
      { col: 3, row: 0 },
      { col: 0, row: 1, colSpan: 4 },
    ],
  },

  // 6 panes
  colsTemplate("n6-cols", 6),
  rowsTemplate("n6-rows", 6),
  gridTemplate("n6-grid-2x3", 2, 3),
  gridTemplate("n6-grid-3x2", 3, 2),
  mainSideTemplate("n6-main-left", 6, "left"),
  mainSideTemplate("n6-main-right", 6, "right"),

  // 7 panes
  colsTemplate("n7-cols", 7),
  rowsTemplate("n7-rows", 7),
  mainSideGridTemplate("n7-main-left", "left", 2, 3),

  // 8 panes
  colsTemplate("n8-cols", 8),
  rowsTemplate("n8-rows", 8),
  gridTemplate("n8-grid-2x4", 2, 4),
  gridTemplate("n8-grid-4x2", 4, 2),

  // 9 panes
  gridTemplate("n9-grid-3x3", 3, 3),
  colsTemplate("n9-cols", 9),
  rowsTemplate("n9-rows", 9),
  mainSideGridTemplate("n9-main-left", "left", 2, 4),

  // 10 panes
  colsTemplate("n10-cols", 10),
  rowsTemplate("n10-rows", 10),
  gridTemplate("n10-grid-2x5", 2, 5),

  // 12 panes
  gridTemplate("n12-grid-3x4", 3, 4),
  gridTemplate("n12-grid-4x3", 4, 3),
  colsTemplate("n12-cols", 12),

  // 14 panes
  gridTemplate("n14-grid-2x7", 2, 7),

  // 16 panes
  gridTemplate("n16-grid-4x4", 4, 4),
  gridTemplate("n16-grid-2x8", 2, 8),
] as const;

const TEMPLATE_BY_ID = new Map<string, LayoutTemplate>(
  LAYOUT_TEMPLATES.map((t) => [t.id, t]),
);

export const LAYOUT_TEMPLATE_IDS = LAYOUT_TEMPLATES.map((t) => t.id) as [
  LayoutTemplateId,
  ...LayoutTemplateId[],
];

export function isLayoutTemplateId(value: unknown): value is LayoutTemplateId {
  return typeof value === "string" && TEMPLATE_BY_ID.has(value);
}

export function getLayoutTemplate(id: string): LayoutTemplate {
  return TEMPLATE_BY_ID.get(id) ?? TEMPLATE_BY_ID.get(DEFAULT_LAYOUT_ID)!;
}

export function cellCountForLayout(id: string): number {
  return getLayoutTemplate(id).paneCount;
}

export function templatesForPaneCount(paneCount: number): LayoutTemplate[] {
  return LAYOUT_TEMPLATES.filter((t) => t.paneCount === paneCount);
}

export function migrateLegacyGridMode(value: string): LayoutTemplateId {
  const mapped = LEGACY_GRID_MODE_MAP[value];
  if (mapped && TEMPLATE_BY_ID.has(mapped)) return mapped;
  if (TEMPLATE_BY_ID.has(value)) return value as LayoutTemplateId;
  return DEFAULT_LAYOUT_ID;
}

export function normalizeLayoutId(
  record: Record<string, unknown>,
): LayoutTemplateId {
  if (typeof record.layoutId === "string" && isLayoutTemplateId(record.layoutId)) {
    return record.layoutId;
  }
  if (typeof record.gridMode === "string") {
    return migrateLegacyGridMode(record.gridMode);
  }
  return DEFAULT_LAYOUT_ID;
}

/** Resolve layout id for persistence parse; preserves invalid ids for schema rejection. */
export function resolveLayoutIdForSnapshot(
  record: Record<string, unknown>,
): string {
  if (typeof record.layoutId === "string" && isLayoutTemplateId(record.layoutId)) {
    return record.layoutId;
  }
  if (typeof record.gridMode === "string") {
    return migrateLegacyGridMode(record.gridMode);
  }
  if (typeof record.layoutId === "string") {
    return record.layoutId;
  }
  return DEFAULT_LAYOUT_ID;
}

/** Validate template geometry: no overlaps and full grid coverage. */
export function validateTemplateGeometry(template: LayoutTemplate): boolean {
  const matrix: boolean[][] = Array.from({ length: template.rows }, () =>
    Array.from({ length: template.columns }, () => false),
  );

  if (template.cells.length !== template.paneCount) return false;

  for (const cell of template.cells) {
    const cs = cell.colSpan ?? 1;
    const rs = cell.rowSpan ?? 1;
    if (cell.col < 0 || cell.row < 0) return false;
    if (cell.col + cs > template.columns || cell.row + rs > template.rows) return false;
    for (let r = cell.row; r < cell.row + rs; r++) {
      for (let c = cell.col; c < cell.col + cs; c++) {
        if (matrix[r]![c]) return false;
        matrix[r]![c] = true;
      }
    }
  }

  return matrix.every((row) => row.every(Boolean));
}
