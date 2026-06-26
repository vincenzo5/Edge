import type { SerializedChartState } from '@edge/chart-core';
import { serializeChartState } from '@edge/chart-core';
import type { EdgeChartProps } from './types';

/** Map serializable chart state into EdgeChart props (excluding candles/theme). */
export type ChartStateProps = Pick<
  EdgeChartProps,
  | 'state'
  | 'collapsedKeys'
  | 'maximizedKey'
  | 'paneOrder'
  | 'symbol'
  | 'symbolName'
  | 'exchange'
  | 'interval'
  | 'range'
  | 'rangePreset'
>;

export function chartStateToProps(
  state: SerializedChartState,
  meta: Omit<ChartStateProps, 'state'> = {},
): ChartStateProps {
  return {
    state,
    collapsedKeys: state.collapsedPanes
      ? new Set(state.collapsedPanes)
      : meta.collapsedKeys,
    maximizedKey: state.maximizedPane ?? meta.maximizedKey ?? null,
    paneOrder: state.paneOrder ?? meta.paneOrder,
    symbol: meta.symbol,
    symbolName: meta.symbolName,
    exchange: meta.exchange,
    interval: meta.interval,
    range: meta.range,
    rangePreset: meta.rangePreset,
  };
}

/** Build SerializedChartState from EdgeChart state props and live drawings. */
export function propsToChartState(
  props: ChartStateProps,
  drawings?: SerializedChartState['drawings'],
): SerializedChartState {
  const { state } = props;
  return serializeChartState({
    chartType: state.chartType,
    indicators: state.indicators,
    drawings: drawings ?? state.drawings,
    paneOrder: props.paneOrder ?? state.paneOrder,
    collapsedPanes: props.collapsedKeys
      ? [...props.collapsedKeys]
      : state.collapsedPanes,
    maximizedPane: props.maximizedKey ?? state.maximizedPane ?? null,
    paneHeights: state.paneHeights,
    chartSettings: state.chartSettings,
    mainSeriesVisible: state.mainSeriesVisible,
  });
}
