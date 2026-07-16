import { z } from "zod";

import {
  migrateLayoutSync,
  INTERVALS,
  RANGES,
  CHART_TYPES,
  LAYOUT_TEMPLATE_IDS,
  resolveLayoutIdForSnapshot,
  type ChartLayout,
  type LegacySidebarPanelId,
  type SidebarPanelId,
} from "@/lib/chartConfig";
import { migrateSidebarWidth } from "@/lib/responsive/sidebarWidth";
import {
  normalizeFloatingGeometry,
  normalizePanelPresentation,
} from "@/lib/sidebar/floatingPanelGeometry";
import { writeRequestBaseSchema, SCHEMA_VERSION } from "@/lib/persistence/common";

const rangeValues = RANGES.map((r) => r.value) as [string, ...string[]];
const intervalValues = INTERVALS.map((i) => i.value) as [string, ...string[]];
const chartTypeValues = CHART_TYPES.map((c) => c.value) as [string, ...string[]];
const layoutIdValues = LAYOUT_TEMPLATE_IDS;

const drawingPointSchema = z.object({
  dataIndex: z.number().int().optional(),
  timestamp: z.number().optional(),
  value: z.number().optional(),
});

const serializedDrawingSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  label: z.string(),
  points: z.array(drawingPointSchema).max(500),
  mode: z.string().optional(),
  styles: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  visible: z.boolean(),
  locked: z.boolean(),
  zLevel: z.number().int(),
  paneId: z.string().optional(),
});

const indicatorConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  pane: z.enum(["main", "sub"]),
  params: z.record(z.string(), z.number()).optional(),
  inputs: z.record(z.string(), z.unknown()).optional(),
  styles: z.record(z.string(), z.unknown()).optional(),
  visible: z.boolean().optional(),
});

const cellConfigSchema = z.object({
  symbol: z.string().trim().min(1).max(16),
  symbolName: z.string().optional(),
  exchange: z.string().optional(),
  range: z.enum(rangeValues),
  interval: z.enum(intervalValues),
  rangePreset: z.enum(rangeValues).nullable().optional(),
  chartType: z.enum(chartTypeValues),
  indicators: z.array(indicatorConfigSchema).max(100),
  drawings: z.array(serializedDrawingSchema).max(1000),
  paneOrder: z.array(z.string()).optional(),
  collapsedPanes: z.array(z.string()).optional(),
  maximizedPane: z.string().nullable().optional(),
  paneHeights: z.record(z.string(), z.number()).optional(),
  chartSettings: z.record(z.string(), z.unknown()).optional(),
});

const SIDEBAR_PANEL_ID_VALUES = [
  "object-tree",
  "watchlist",
  "account",
  "settings",
  "options",
  "screener",
  "trade",
] as const satisfies readonly SidebarPanelId[];

function migrateLegacySidebarPanelId(
  value: LegacySidebarPanelId | null | undefined,
): SidebarPanelId | null {
  if (value == null) return null;
  if (value === "risk") return "settings";
  if ((SIDEBAR_PANEL_ID_VALUES as readonly string[]).includes(value)) {
    return value as SidebarPanelId;
  }
  return null;
}

function normalizePresentationRecord(
  value: unknown,
): Partial<Record<SidebarPanelId, "docked" | "floating">> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const result: Record<string, "docked" | "floating"> = {};
  for (const panelId of SIDEBAR_PANEL_ID_VALUES) {
    const presentation = normalizePanelPresentation(record[panelId]);
    if (presentation) result[panelId] = presentation;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function normalizeFloatingGeometryRecord(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, { x: number; y: number; width: number; height: number }>;
  const result: Record<string, { x: number; y: number; width: number; height: number }> = {};
  for (const panelId of SIDEBAR_PANEL_ID_VALUES) {
    const geometry = normalizeFloatingGeometry(panelId, record[panelId]);
    if (geometry) result[panelId] = geometry;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function migrateSidebarSnapshot(sidebar: unknown): ChartLayout["sidebar"] | undefined {
  if (!sidebar || typeof sidebar !== "object") return undefined;
  const record = sidebar as Record<string, unknown>;
  const rawActive = record.activePanel as LegacySidebarPanelId | null | undefined;
  const activePanel = migrateLegacySidebarPanelId(rawActive);
  const width = migrateSidebarWidth({
    activePanel: rawActive ?? null,
    width: record.width as number | undefined,
    panelWidths: record.panelWidths as
      | Partial<Record<LegacySidebarPanelId, number>>
      | undefined,
  });
  const presentation = normalizePresentationRecord(record.presentation);
  const floatingGeometry = normalizeFloatingGeometryRecord(record.floatingGeometry);
  return {
    activePanel,
    ...(width != null ? { width } : {}),
    ...(presentation ? { presentation } : {}),
    ...(floatingGeometry ? { floatingGeometry } : {}),
  };
}

export const chartLayoutSnapshotSchema = z.preprocess((value) => {
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  const layoutId = resolveLayoutIdForSnapshot(record);
  const sync = migrateLayoutSync({
    version: 1,
    layoutId,
    cells: Array.isArray(record.cells) ? (record.cells as ChartLayout["cells"]) : [],
    linked: record.linked as boolean | undefined,
    linkSymbol: record.linkSymbol as boolean | undefined,
    linkInterval: record.linkInterval as boolean | undefined,
    linkCrosshair: record.linkCrosshair as boolean | undefined,
    linkDrawings: record.linkDrawings as boolean | undefined,
  });
  const sidebar = migrateSidebarSnapshot(record.sidebar);
  const { gridMode: _legacyGridMode, ...rest } = record;
  return {
    ...rest,
    layoutId,
    ...sync,
    ...(sidebar ? { sidebar } : {}),
  };
}, z.object({
  version: z.literal(1),
  layoutId: z.enum(layoutIdValues),
  linkSymbol: z.boolean(),
  linkInterval: z.boolean(),
  linkCrosshair: z.boolean(),
  linkDrawings: z.boolean(),
  activeCellIndex: z.number().int().nonnegative(),
  theme: z.enum(["light", "dark"]),
  toolbarPrefs: z
    .object({
      groupSelections: z.record(z.string(), z.string()).optional(),
      keepDrawing: z.boolean().optional(),
      magnet: z.boolean().optional(),
    })
    .optional(),
  sidebar: z
    .object({
      activePanel: z.enum(SIDEBAR_PANEL_ID_VALUES).nullable(),
      width: z.number().finite().optional(),
      presentation: z
        .record(z.string(), z.enum(["docked", "floating"]))
        .optional(),
      floatingGeometry: z
        .record(
          z.string(),
          z.object({
            x: z.number().finite(),
            y: z.number().finite(),
            width: z.number().finite(),
            height: z.number().finite(),
          }),
        )
        .optional(),
    })
    .optional(),
  cells: z.array(cellConfigSchema).min(1).max(16),
}));

export type ChartLayoutSnapshot = z.infer<typeof chartLayoutSnapshotSchema>;

export const chartWorkspaceWriteSchema = writeRequestBaseSchema.extend({
  workspaceName: z.string().trim().min(1).max(120).optional(),
  chartLayoutSnapshot: chartLayoutSnapshotSchema,
});

export const chartWorkspaceResponseSchema = z.object({
  id: z.string().uuid(),
  workspaceName: z.string(),
  schemaVersion: z.literal(1),
  syncRevision: z.number().int().positive(),
  updatedAt: z.string().datetime(),
  chartLayoutSnapshot: chartLayoutSnapshotSchema,
});

export const chartWorkspaceSummarySchema = chartWorkspaceResponseSchema.extend({
  isDefault: z.boolean(),
});

export const chartWorkspaceListResponseSchema = z.object({
  workspaces: z.array(chartWorkspaceSummarySchema),
});

export const chartWorkspaceCreateSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  workspaceName: z.string().trim().min(1).max(120),
  chartLayoutSnapshot: chartLayoutSnapshotSchema,
});

export function parseChartLayoutSnapshot(value: unknown): ChartLayout | null {
  const parsed = chartLayoutSnapshotSchema.safeParse(value);
  return parsed.success ? (parsed.data as ChartLayout) : null;
}
