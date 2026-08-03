export type SurfaceId =
  | "chart"
  | "screener"
  | "journal"
  | "scripts"
  | "alerts"
  | "copilot"
  | "expectancy"
  | "placeholder";

export type ExpectancyMode = "deterministic" | "monteCarlo";

export type ExpectancySurfaceParams = {
  presetId?: string;
  startingEquity: number;
  years: number;
  winRate: number;
  avgWinR: number;
  avgLossR: number;
  riskFraction: number;
  tradesPerWeek: number;
  monteCarloRuns?: number;
  monteCarloSeed?: number;
};

export type SplitDirection = "row" | "column";

export type DropEdge = "left" | "right" | "top" | "bottom" | "center";

export type TileSurfaceState = {
  screenerView?: "review" | "screens" | "results" | "keepers";
  journalView?: "dashboard" | "trades" | "open" | "settings";
  selectedScriptId?: string;
  selectedAlertId?: string;
  alertPrefill?: {
    symbol: string;
    operator:
      | "cross_above"
      | "cross_below"
      | "touch_above"
      | "touch_below"
      | "enter_zone"
      | "exit_zone";
    price: number;
    message?: string;
    drawingId?: string;
    drawingKind?: "horizontal_line" | "trend_line" | "rectangle";
    priceHigh?: number;
    tlT0?: number;
    tlV0?: number;
    tlT1?: number;
    tlV1?: number;
    tlExtendLeft?: boolean;
    tlExtendRight?: boolean;
  };
  expectancyMode?: ExpectancyMode;
  expectancyParams?: ExpectancySurfaceParams;
};

export type TileInstance = {
  id: string;
  surfaceId: SurfaceId;
  /** Postgres chart-workspace resource id when synced (Phase 1). */
  chartWorkspaceId?: string;
  surfaceState?: TileSurfaceState;
};

export type SplitNode = {
  type: "split";
  id: string;
  direction: SplitDirection;
  children: [LayoutNode, LayoutNode];
  sizes: [number, number];
};

export type TileNode = {
  type: "tile";
  id: string;
  tileId: string;
};

export type LayoutNode = SplitNode | TileNode;

export type AppWorkspaceDocument = {
  version: 1;
  id: string;
  name: string;
  root: LayoutNode;
  tiles: Record<string, TileInstance>;
  activeTileId?: string;
  updatedAt: string;
};

export type AppWorkspacesState = {
  version: 1;
  activeDocumentId: string;
  documents: AppWorkspaceDocument[];
};

export function isSplitNode(node: LayoutNode): node is SplitNode {
  return node.type === "split";
}

export function isTileNode(node: LayoutNode): node is TileNode {
  return node.type === "tile";
}
