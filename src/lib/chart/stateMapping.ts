import type { SerializedChartState } from '@edge/chart-core';
import { serializeChartState } from '@edge/chart-core';
import type { CellConfig } from '@/lib/chartConfig';
import { mergeChartSettings, migrateChartSettings, serializeChartSettings } from '@/lib/chart/chartSettings';

export function cellConfigToChartState(cell: CellConfig): SerializedChartState {
  return serializeChartState({
    chartType: cell.chartType,
    indicators: cell.indicators,
    drawings: cell.drawings,
    paneOrder: cell.paneOrder,
    collapsedPanes: cell.collapsedPanes,
    maximizedPane: cell.maximizedPane ?? null,
    paneHeights: cell.paneHeights,
    chartSettings: cell.chartSettings
      ? serializeChartSettings(mergeChartSettings(cell.chartSettings))
      : undefined,
    mainSeriesVisible: cell.mainSeriesVisible,
  });
}

export function chartStateToCellConfig(
  state: SerializedChartState,
  base: CellConfig,
): CellConfig {
  return {
    ...base,
    chartType: state.chartType,
    indicators: state.indicators,
    drawings: state.drawings,
    paneOrder: state.paneOrder,
    collapsedPanes: state.collapsedPanes,
    maximizedPane: state.maximizedPane ?? null,
    paneHeights: state.paneHeights,
    chartSettings: state.chartSettings
      ? migrateChartSettings(state.chartSettings)
      : base.chartSettings,
    mainSeriesVisible: state.mainSeriesVisible,
  };
}
