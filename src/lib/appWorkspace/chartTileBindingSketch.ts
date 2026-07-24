import { z } from "zod";

/**
 * Phase 0 contract sketch — not wired to production hydrate paths.
 * Phase 1 implements per-tile chart layout binding against these shapes.
 */

export const CHART_TILE_BINDING_SKETCH_VERSION = 1 as const;

/** Legacy global key — Phase 1 migration attaches this to the primary chart tile only. */
export const LEGACY_WORKSPACE_TABS_STORAGE_KEY = "tv-ai:workspace-tabs:v1";

/** Phase 1 target: optional Postgres chart-workspace resource id on a chart tile. */
export const chartTileBindingSketchSchema = z.object({
  id: z.string().min(1),
  surfaceId: z.literal("chart"),
  chartWorkspaceId: z.string().uuid().optional(),
});

export type ChartTileBindingSketch = z.infer<typeof chartTileBindingSketchSchema>;

/** Per-tile local storage key (Phase 1). */
export function workspaceTabsStorageKeyForTile(tileId: string): string {
  return `tv-ai:workspace-tabs:v1:tile:${tileId}`;
}

/**
 * Phase 1 migration resolver: legacy global key for primary chart tile;
 * scoped key for all other chart tiles.
 */
export function resolveWorkspaceTabsMigrationKey(
  tileId: string,
  isPrimaryChartTile: boolean,
): string {
  if (isPrimaryChartTile) {
    return LEGACY_WORKSPACE_TABS_STORAGE_KEY;
  }
  return workspaceTabsStorageKeyForTile(tileId);
}

/** Documented Phase 1 prop contract for ChartTileHost → StockApp bootstrap. */
export type ChartTileHostBindingContract = {
  tileId: string;
  isPrimaryChartTile: boolean;
  chartWorkspaceId?: string;
};
