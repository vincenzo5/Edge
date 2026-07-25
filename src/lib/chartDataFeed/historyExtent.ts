import type { Candle, ChartHistoryExtent } from '@edge/chart-core';
import { mergeChartHistoryExtent, visibleWindowMs } from '@edge/chart-core';

export { visibleWindowMs };

/** Session-scoped extent tracker independent of resident bar trimming. */
export function advanceChartHistoryExtent(
  prev: ChartHistoryExtent | null,
  page: ChartHistoryExtent | null | undefined,
  candles: Candle[],
  hasMoreOlder: boolean,
): ChartHistoryExtent | null {
  return mergeChartHistoryExtent(prev, page ?? null, candles, hasMoreOlder);
}
