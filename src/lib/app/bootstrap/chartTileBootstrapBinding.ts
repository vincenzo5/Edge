import type { ChartTileHostBindingContract } from "@/lib/appWorkspace/chartTileBindingSketch";

/** Standalone `/chart` route — primary tile uses legacy global storage key. */
export const STANDALONE_CHART_TILE_BINDING: ChartTileHostBindingContract = {
  tileId: "standalone",
  isPrimaryChartTile: true,
};

export type ChartTileBootstrapBinding = ChartTileHostBindingContract;

export function resolveChartTileBootstrapBinding(
  binding?: ChartTileBootstrapBinding,
): ChartTileBootstrapBinding {
  return binding ?? STANDALONE_CHART_TILE_BINDING;
}
